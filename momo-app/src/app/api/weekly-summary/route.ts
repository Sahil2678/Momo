import { NextRequest, NextResponse } from "next/server";
import { getOrdersFromSheet } from "@/lib/sheetbest";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Security check: Verify CRON_SECRET against Authorization header or ?secret= query param
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get("secret");

    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const isValidBearer = authHeader === `Bearer ${cronSecret}`;
      const isValidParam = secretParam === cronSecret;

      if (!isValidBearer && !isValidParam) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const sheetBestUrl = process.env.SHEET_BEST_URL;
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    let pendingOrders: Array<{
      Name: string;
      Phone: string;
      Order_ID: string;
      Payment_Status: string;
      Baki_Amount: number;
    }> = [];

    // 2. Fetch pending orders: Try Sheet.best first, fallback to MongoDB if SHEET_BEST_URL is missing
    if (sheetBestUrl) {
      const allOrders = await getOrdersFromSheet(sheetBestUrl);
      pendingOrders = (allOrders || [])
        .filter((order) => {
          const status = (order.Payment_Status || "").trim().toLowerCase();
          const baki = parseFloat(String(order.Baki_Amount || 0));
          const isPendingOrPart =
            status.includes("pending") ||
            status.includes("part") ||
            status === "pend";

          return isPendingOrPart && !isNaN(baki) && baki > 0;
        })
        .map((order) => ({
          Name: order.Name || "Customer",
          Phone: order.Phone || "N/A",
          Order_ID: order.Order_ID || "N/A",
          Payment_Status: order.Payment_Status || "Pending",
          Baki_Amount: parseFloat(String(order.Baki_Amount || 0)),
        }));
    } else {
      // Fallback directly to MongoDB!
      const { connectToDatabase } = await import("@/lib/mongodb");
      const Order = (await import("@/models/Order")).default;
      await connectToDatabase();

      const dbOrders = await Order.find({
        $or: [
          { status: "pending" },
          { bakiAmount: { $gt: 0 } },
        ],
      }).sort({ createdAt: -1 });

      pendingOrders = dbOrders.map((o: any) => {
        const baki = typeof o.bakiAmount === "number" ? o.bakiAmount : o.total;
        return {
          Name: o.customer?.name || o.customer?.ownerName || "Customer",
          Phone: o.customer?.phone || "N/A",
          Order_ID: String(o._id),
          Payment_Status: o.status === "confirmed" ? "Partially Paid" : "Pending",
          Baki_Amount: baki,
        };
      }).filter((o) => o.Baki_Amount > 0);
    }

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
      orders: pendingOrders,
    });
  } catch (error: unknown) {
    console.error("Weekly summary cron error:", error);
    const message = error instanceof Error ? error.message : "Failed to run weekly summary cron";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
