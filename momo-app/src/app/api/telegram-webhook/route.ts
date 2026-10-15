import { NextRequest, NextResponse } from "next/server";
import {
  answerTelegramCallbackQuery,
  editTelegramMessageCaption,
  editTelegramMessageText,
  sendTelegramMessage,
} from "@/lib/telegram";
import {
  getOrderByIdFromSheet,
  patchOrderByOrderId,
} from "@/lib/sheetbest";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";

/**
 * Maps callback action key to clean status text and emojis
 */
function getStatusMapping(action: string): { label: string; sheetStatus: string; dbStatus: string } {
  switch (action) {
    case "paid":
      return { label: "✅ Paid", sheetStatus: "Paid", dbStatus: "confirmed" };
    case "sched":
      return { label: "📅 Scheduled", sheetStatus: "Scheduled", dbStatus: "preparing" };
    case "part":
      return { label: "💵 Partially Paid", sheetStatus: "Partially Paid", dbStatus: "confirmed" };
    case "pend":
      return { label: "⏳ Pending", sheetStatus: "Pending", dbStatus: "pending" };
    default:
      return { label: action, sheetStatus: action, dbStatus: "confirmed" };
  }
}

export async function POST(request: NextRequest) {
  const telegramToken = process.env.TELEGRAM_TOKEN;
  const sheetBestUrl = process.env.SHEET_BEST_URL;

  if (!telegramToken) {
    console.error("TELEGRAM_TOKEN is missing in environment variables");
    return NextResponse.json({ ok: false, error: "Bot token not configured" }, { status: 500 });
  }

  try {
    const update = await request.json();

    // =========================================================================
    // CASE A & B: CALLBACK QUERY (Inline Button Clicks)
    // =========================================================================
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackId = callbackQuery.id;
      const data = callbackQuery.data || "";
      const message = callbackQuery.message;
      const chatId = message?.chat?.id;
      const messageId = message?.message_id;

      // Handle buttons starting with status_
      if (data.startsWith("status_")) {
        // Format: status_[action]_[orderId]
        // Examples: status_paid_6623f..., status_part_ORD-1234
        const parts = data.split("_");
        const action = parts[1]; // paid, sched, part, pend
        const orderId = parts.slice(2).join("_"); // handles IDs that might have underscores

        // Acknowledge callback immediately to dismiss Telegram button spinner
        await answerTelegramCallbackQuery(telegramToken, callbackId);

        // CASE B: "Part Paid" Button Click -> Trigger force_reply prompt
        if (action === "part") {
          await sendTelegramMessage({
            token: telegramToken,
            chatId,
            text: `Order ID: ${orderId}\nHow much cash did you receive? Reply with the exact number only.`,
            replyMarkup: {
              force_reply: true,
              selective: false,
            },
            replyToMessageId: messageId,
          });

          return NextResponse.json({ ok: true, case: "part_paid_prompt_sent" });
        }

        // CASE A: Direct status change (Paid, Scheduled, Pending)
        const { label, sheetStatus, dbStatus } = getStatusMapping(action);

        // 1. Update Sheet.best
        if (sheetBestUrl) {
          try {
            const updates: Record<string, any> = {
              Payment_Status: sheetStatus,
            };

            // If marked Paid, auto balance Paid_Amount and Baki_Amount
            if (action === "paid") {
              const currentOrder = await getOrderByIdFromSheet(sheetBestUrl, orderId);
              if (currentOrder && currentOrder.Total) {
                const totalNum = Number(currentOrder.Total) || 0;
                updates.Paid_Amount = totalNum;
                updates.Baki_Amount = 0;
              }
            }

            await patchOrderByOrderId(sheetBestUrl, orderId, updates);
          } catch (sheetErr) {
            console.error(`Sheet.best PATCH error for order ${orderId}:`, sheetErr);
          }
        }

        // 2. Update MongoDB status, balance & paymentStatus if connected
        try {
          await connectToDatabase();
          if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
            const dbUpdates: Record<string, any> = {
              status: dbStatus,
              paymentStatus: sheetStatus,
            };
            if (action === "paid") {
              const currentOrder = await Order.findById(orderId);
              if (currentOrder) {
                dbUpdates.paidAmount = currentOrder.total;
                dbUpdates.bakiAmount = 0;
              }
            }
            await Order.findByIdAndUpdate(orderId, dbUpdates);
          }
        } catch (dbErr) {
          console.warn("DB update failed (non-critical):", dbErr);
        }

        // 3. Update the Telegram message to reflect the new status and REMOVE inline buttons permanently
        try {
          // If action is "paid", inline keyboard is removed permanently ({ inline_keyboard: [] })
          // so nobody can click or change the status afterwards!
          const replyMarkup = { inline_keyboard: [] };

          if (message?.caption !== undefined) {
            let updatedCaption = message.caption;
            if (updatedCaption.includes("Payment Status:")) {
              updatedCaption = updatedCaption.replace(
                /Payment Status:.*(\n|$)/i,
                `Payment Status: ${label}$1`
              );
            } else {
              updatedCaption += `\n\n<b>Status Updated:</b> ${label}`;
            }

            if (action === "paid") {
              updatedCaption = updatedCaption.replace(
                /<b>Baki \(Balance\):<\/b>.*(\n|$)/i,
                `<b>Baki (Balance):</b> Rs. 0 (Fully Cleared ✅)$1`
              );
            }

            // Remove prompt text
            updatedCaption = updatedCaption.replace(
              /<i>Select an action below to update payment status:<\/i>/,
              `<b>🔒 [Status Locked: ${label}]</b>`
            );

            await editTelegramMessageCaption({
              token: telegramToken,
              chatId,
              messageId,
              caption: updatedCaption,
              replyMarkup,
            });
          } else if (message?.text) {
            let updatedText = message.text;
            if (updatedText.includes("Payment Status:")) {
              updatedText = updatedText.replace(
                /Payment Status:.*(\n|$)/i,
                `Payment Status: ${label}$1`
              );
            } else {
              updatedText += `\n\nStatus: ${label}`;
            }

            await editTelegramMessageText({
              token: telegramToken,
              chatId,
              messageId,
              text: updatedText,
              replyMarkup,
            });
          }

          // If marked Paid, send a separate confirmation message to the group
          if (action === "paid") {
            await sendTelegramMessage({
              token: telegramToken,
              chatId,
              text: `🎉 <b>CONFIRMATION: Order marked as PAID!</b>\n\n` +
                    `Order ID: <code>${orderId}</code> has been successfully marked as <b>Paid ✅</b>.\n` +
                    `Full amount received. Buttons are now disabled to prevent accidental changes.`,
              replyToMessageId: messageId,
            });
          }
        } catch (tgEditErr) {
          console.error("Failed to edit Telegram message:", tgEditErr);
        }

        return NextResponse.json({ ok: true, statusUpdatedTo: sheetStatus });
      }
    }

    // =========================================================================
    // CASE C: HANDLING ADMIN REPLY WITH NUMBER
    // =========================================================================
    if (update.message) {
      const msg = update.message;
      const text = (msg.text || "").trim();
      const replyToMsg = msg.reply_to_message;
      const chatId = msg.chat?.id;

      // Check if this message is a reply to our prompt:
      // "Order ID: [ID]\nHow much cash did you receive? Reply with the exact number only."
      const replyPrompt = replyToMsg?.text || "";
      const match = replyPrompt.match(/Order ID:\s*([^\s\n]+)/i);

      if (match) {
        const orderId = match[1].trim();
        // Parse numerical amount from user reply
        const cleanedNumber = text.replace(/[^0-9.]/g, "");
        const paidNumber = parseFloat(cleanedNumber);

        if (isNaN(paidNumber) || paidNumber < 0) {
          await sendTelegramMessage({
            token: telegramToken,
            chatId,
            text: `⚠️ <b>Invalid Amount:</b> Could not recognize a valid number in "<code>${text}</code>". Please reply with numbers only (e.g., <code>1500</code>).`,
            replyToMessageId: msg.message_id,
          });
          return NextResponse.json({ ok: true, error: "Invalid number format" });
        }

        let orderTotal = 0;
        let customerName = "Customer";

        // Fetch the total bill of that Order_ID
        if (sheetBestUrl) {
          try {
            const sheetRow = await getOrderByIdFromSheet(sheetBestUrl, orderId);
            if (sheetRow) {
              orderTotal = Number(sheetRow.Total) || 0;
              if (sheetRow.Name) customerName = sheetRow.Name;
            }
          } catch (e) {
            console.error("Failed to fetch order from Sheet.best:", e);
          }
        }

        // Fallback to Mongo if Sheet total is 0 or unavailable
        if (orderTotal === 0 && orderId.match(/^[0-9a-fA-F]{24}$/)) {
          try {
            await connectToDatabase();
            const dbOrder = await Order.findById(orderId);
            if (dbOrder) {
              orderTotal = Number(dbOrder.total) || 0;
              customerName = dbOrder.customer?.name || customerName;
            }
          } catch (e) {
            console.warn("Mongo lookup fallback failed:", e);
          }
        }

        // Calculate remainder: Baki_Amount = Total - Paid
        const bakiAmount = Math.max(0, orderTotal - paidNumber);
        const paymentStatus = bakiAmount === 0 ? "Paid" : "Partially Paid";

        // Send PATCH request to Sheet.best
        if (sheetBestUrl) {
          try {
            await patchOrderByOrderId(sheetBestUrl, orderId, {
              Paid_Amount: paidNumber,
              Baki_Amount: bakiAmount,
              Payment_Status: paymentStatus,
            });
          } catch (sheetPatchErr) {
            console.error(`Sheet.best PATCH error for ${orderId}:`, sheetPatchErr);
          }
        }

        // Also update MongoDB
        try {
          await connectToDatabase();
          if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
            await Order.findByIdAndUpdate(orderId, {
              paidAmount: paidNumber,
              bakiAmount: bakiAmount,
              paymentStatus: paymentStatus,
              status: bakiAmount === 0 ? "confirmed" : "pending",
            });
          }
        } catch (dbErr) {
          console.warn("MongoDB update for partial payment failed:", dbErr);
        }

        // Send a confirmation message back to the group
        const confirmationText =
          `✅ <b>PAYMENT UPDATED SUCCESSFULLY!</b>\n\n` +
          `<b>Order ID:</b> <code>${orderId}</code>\n` +
          `<b>Customer:</b> ${customerName}\n` +
          `<b>Total Bill:</b> Rs. ${orderTotal.toLocaleString()}\n` +
          `<b>Paid Amount:</b> Rs. ${paidNumber.toLocaleString()}\n` +
          `<b>Remaining Baki:</b> Rs. ${bakiAmount.toLocaleString()}\n` +
          `<b>Status:</b> ${paymentStatus === "Paid" ? "✅ Paid" : "💵 Partially Paid"}`;

        await sendTelegramMessage({
          token: telegramToken,
          chatId,
          text: confirmationText,
          replyToMessageId: msg.message_id,
        });

        return NextResponse.json({
          ok: true,
          case: "partial_payment_processed",
          orderId,
          paid: paidNumber,
          baki: bakiAmount,
        });
      }
    }

    return NextResponse.json({ ok: true, ignored: true });
  } catch (error: unknown) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: false, error: "Internal webhook error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "telegram-webhook",
    time: new Date().toISOString(),
  });
}
