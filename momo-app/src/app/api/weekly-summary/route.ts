import { NextRequest, NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/telegram";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Security check: Verify CRON_SECRET or valid admin session
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const isValidCron = Boolean(
      cronSecret &&
      authHeader === `Bearer ${cronSecret}`
    );

    if (!isValidCron) {
      const { verifyAdminSession } = await import("@/lib/auth");
      const isAdmin = await verifyAdminSession(request);
      if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
      }
    }

    const telegramToken = process.env.TELEGRAM_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    const pendingOrders: Array<{
      Name: string;
      Phone: string;
      Order_ID: string;
      Payment_Status: string;
      Baki_Amount: number;
    }> = [];

    await connectToDatabase();
    const dbOrders = await Order.find({
      $or: [{ status: "pending" }, { bakiAmount: { $gt: 0 } }],
    }).sort({ createdAt: -1 });

    pendingOrders.push(
      ...dbOrders
        .map((order) => {
          const bakiAmount = typeof order.bakiAmount === "number" ? order.bakiAmount : order.total;
          return {
            Name: order.customer?.name || order.customer?.ownerName || "Customer",
            Phone: order.customer?.phone || "N/A",
            Order_ID: String(order._id),
            Payment_Status: order.paymentStatus || (order.status === "confirmed" ? "Partially Paid" : "Pending"),
            Baki_Amount: bakiAmount,
          };
        })
        .filter((order) => order.Baki_Amount > 0)
    );

    // Calculate total outstanding market credit
    const totalOutstandingMarketCredit = pendingOrders.reduce((sum, order) => {
      const baki = parseFloat(String(order.Baki_Amount || 0));
      return sum + (isNaN(baki) ? 0 : baki);
    }, 0);

    // Format date string
    const reportDate = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    let messageText = "";

    if (pendingOrders.length === 0) {
      messageText =
        `📊 <b>WEEKLY MARKET CREDIT & OUTSTANDING REPORT</b>\n` +
        `📅 <i>${reportDate}</i>\n\n` +
        `🎉 <b>Great news!</b> There are currently no pending dues or outstanding market credit.\n` +
        `All wholesale accounts are settled!`;
    } else {
      // Group or list each customer's details
      const customerRows = pendingOrders
        .map((order, index) => {
          const name = order.Name || "Unnamed Customer";
          const phone = order.Phone || "N/A";
          const baki = parseFloat(String(order.Baki_Amount || 0)).toLocaleString();
          const orderId = order.Order_ID || "N/A";
          const status = order.Payment_Status || "Pending";

          return (
            `<b>${index + 1}. ${name}</b>\n` +
            `   📞 Phone: ${phone}\n` +
            `   🆔 Order: <code>${orderId}</code> (${status})\n` +
            `   💰 Remaining Baki: <b>Rs. ${baki}</b>`
          );
        })
        .join("\n\n");

      messageText =
        `📊 <b>WEEKLY OUTSTANDING MARKET CREDIT SUMMARY</b>\n` +
        `📅 <i>${reportDate}</i>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${customerRows}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🚨 <b>Total Active Debtors:</b> ${pendingOrders.length}\n` +
        `💸 <b>TOTAL OUTSTANDING CREDIT:</b> <b>Rs. ${totalOutstandingMarketCredit.toLocaleString()}</b>\n\n` +
        `<i>Please follow up with customers with high outstanding balances.</i>`;
    }

    // 4. Send compiled summary report to admin's Telegram chat
    if (telegramToken && telegramChatId) {
      await sendTelegramMessage({
        token: telegramToken,
        chatId: telegramChatId,
        text: messageText,
      });
    } else {
      console.warn("Telegram credentials not configured; skipping Telegram broadcast.");
    }

    return NextResponse.json({
      success: true,
      reportDate,
      debtorsCount: pendingOrders.length,
      totalOutstandingMarketCredit,
    }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error: unknown) {
    console.error("Weekly summary cron error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run weekly summary." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
