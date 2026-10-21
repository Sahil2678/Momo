import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  answerTelegramCallbackQuery,
  editTelegramMessageCaption,
  editTelegramMessageText,
  sendTelegramMessage,
  getOrderKeyboard,
} from "@/lib/telegram";
import { verifyAdminSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";

export const dynamic = "force-dynamic";

/**
 * Safely verify secret token using constant-time comparison
 */
function isValidSecretToken(providedSecret: string | null, expectedSecret: string): boolean {
  if (!providedSecret) return false;
  try {
    const expectedBuffer = Buffer.from(expectedSecret);
    const providedBuffer = Buffer.from(providedSecret);
    return (
      expectedBuffer.length === providedBuffer.length &&
      timingSafeEqual(expectedBuffer, providedBuffer)
    );
  } catch {
    return false;
  }
}

/**
 * Maps callback action key to clean status text and emojis
 */
function getStatusMapping(action: string): { label: string; paymentStatus: string; dbStatus: string } {
  switch (action) {
    case "paid":
      return { label: "✅ Paid", paymentStatus: "Paid", dbStatus: "confirmed" };
    case "sched":
      return { label: "📅 Scheduled", paymentStatus: "Scheduled", dbStatus: "preparing" };
    case "part":
      return { label: "💵 Partially Paid", paymentStatus: "Partially Paid", dbStatus: "confirmed" };
    case "pend":
      return { label: "⏳ Pending", paymentStatus: "Pending", dbStatus: "pending" };
    default:
      return { label: action, paymentStatus: action, dbStatus: "confirmed" };
  }
}

async function registerTelegramWebhook(request: NextRequest) {
  const telegramToken = process.env.TELEGRAM_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!telegramToken || !webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Telegram bot token and webhook secret must be configured." },
      { status: 503 }
    );
  }

  const targetWebhookUrl = `${request.nextUrl.origin}/api/telegram-webhook`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${telegramToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: targetWebhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false,
      }),
    });
    const data = await res.json();

    return NextResponse.json({
      ok: data.ok,
      message: data.ok ? "Telegram webhook successfully registered." : "Telegram rejected the webhook registration.",
      targetWebhookUrl,
    }, { status: data.ok ? 200 : 502 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to register the Telegram webhook." },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  if (searchParams.get("setup") === "1" || searchParams.get("register") === "1") {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ ok: false, error: "Unauthorized access" }, { status: 401 });
    }
    return registerTelegramWebhook(request);
  }

  const telegramToken = process.env.TELEGRAM_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;

  if (!telegramToken) {
    console.error("TELEGRAM_TOKEN is missing in environment variables");
    return NextResponse.json({ ok: false, error: "Bot token not configured" }, { status: 500 });
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Telegram webhook secret is not configured." },
      { status: 503 }
    );
  }

  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!isValidSecretToken(providedSecret, webhookSecret)) {
    console.warn("Telegram webhook secret mismatch");
    return NextResponse.json({ ok: false, error: "Unauthorized webhook request" }, { status: 401 });
  }

  try {
    let update: any;
    try {
      update = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const callbackQuery = update.callback_query;
    const message = update.message;
    const senderId = callbackQuery?.from?.id ?? message?.from?.id;
    const updateChatId = callbackQuery?.message?.chat?.id ?? message?.chat?.id;

    // Sanitize admin IDs (support numeric IDs with or without '@', including negative group IDs)
    const adminIds = (process.env.TELEGRAM_ADMIN_IDS || "")
      .split(",")
      .map((id) => id.trim().replace(/^@/, ""))
      .filter(Boolean);

    // Authorization:
    // Authorized if update originates from the configured admin chat/group,
    // OR if the sender is listed in TELEGRAM_ADMIN_IDS,
    // OR if neither is configured (fallback to bot token authenticity).
    const matchesChat = Boolean(telegramChatId && updateChatId !== undefined && String(updateChatId) === String(telegramChatId));
    const matchesAdmin = Boolean(adminIds.length && senderId !== undefined && adminIds.includes(String(senderId)));
    const isAuthorized = matchesChat || matchesAdmin;

    // If unauthorized, answer callback query with popup and ignore
    if (!isAuthorized) {
      if (callbackQuery) {
        try {
          await answerTelegramCallbackQuery(telegramToken, callbackQuery.id, "❌ Not authorized to update orders.");
        } catch (e) {
          console.warn("Failed to send unauthorized callback answer:", e);
        }
      }
      return NextResponse.json({ ok: true, ignored: true, reason: "unauthorized" });
    }

    // =========================================================================
    // CASE A & B: CALLBACK QUERY (Inline Button Clicks)
    // =========================================================================
    if (callbackQuery) {
      const data = callbackQuery.data || "";
      const msg = callbackQuery.message;
      const chatId = msg?.chat?.id ?? updateChatId;
      const messageId = msg?.message_id;

      // Always acknowledge immediately to dismiss Telegram's button spinner
      try {
        await answerTelegramCallbackQuery(telegramToken, callbackQuery.id);
      } catch (ackErr) {
        console.warn("Failed to acknowledge callback query:", ackErr);
      }

      // Handle buttons starting with status_
      if (data.startsWith("status_")) {
        const parts = data.split("_");
        const action = parts[1]; // paid, sched, part, pend
        const orderId = parts.slice(2).join("_");

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

        // CASE C: "Scheduled" Button Click -> Provide quick slot options
        // NOTE: In Telegram Bot API, inline_keyboard and force_reply CANNOT be combined in one replyMarkup.
        // We use inline_keyboard buttons for quick slots and prompt the user to reply if custom.
        if (action === "sched") {
          await sendTelegramMessage({
            token: telegramToken,
            chatId,
            text:
              `📅 <b>SCHEDULE ORDER DELIVERY:</b>\n` +
              `Order ID: <code>${orderId}</code>\n\n` +
              `Tap a delivery slot below, or <b>reply directly</b> to this message with your custom date/time (e.g. <code>Tomorrow 4 PM</code>):`,
            replyMarkup: {
              inline_keyboard: [
                [
                  { text: "⚡ Today Evening", callback_data: `setsched_${orderId}_Today Evening` },
                  { text: "🌅 Tomorrow Morning", callback_data: `setsched_${orderId}_Tomorrow Morning` },
                ],
                [
                  { text: "🌆 Tomorrow Evening", callback_data: `setsched_${orderId}_Tomorrow Evening` },
                  { text: "📅 Day After Tomorrow", callback_data: `setsched_${orderId}_Day After Tomorrow` },
                ],
              ],
            },
            replyToMessageId: messageId,
          });

          return NextResponse.json({ ok: true, case: "schedule_prompt_sent" });
        }

        // CASE A: Direct status change (Paid, Pending)
        const { label, paymentStatus, dbStatus } = getStatusMapping(action);

        if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
          await sendTelegramMessage({
            token: telegramToken,
            chatId,
            text: `⚠️ Order <code>${orderId}</code> is not stored in the database, so its status cannot be updated.`,
            replyToMessageId: messageId,
          });
          return NextResponse.json({ ok: false, error: "Order is not stored in the database" }, { status: 404 });
        }

        await connectToDatabase();
        const currentOrder = await Order.findById(orderId);
        if (!currentOrder) {
          await sendTelegramMessage({
            token: telegramToken,
            chatId,
            text: `⚠️ Could not find order <code>${orderId}</code> in the database. Status was not updated.`,
            replyToMessageId: messageId,
          });
          return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
        }

        const dbUpdates: Record<string, unknown> = {
          status: dbStatus,
          paymentStatus,
        };
        if (action === "paid") {
          dbUpdates.paidAmount = currentOrder.total;
          dbUpdates.bakiAmount = 0;
        } else if (action === "pend") {
          dbUpdates.paidAmount = 0;
          dbUpdates.bakiAmount = currentOrder.total;
        }

        await Order.findByIdAndUpdate(orderId, dbUpdates);

        // Update the Telegram message
        try {
          // If action is "paid", remove buttons permanently so status is locked.
          // For other statuses, keep the keyboard available for future updates.
          const replyMarkup = action === "paid" ? { inline_keyboard: [] } : getOrderKeyboard(orderId);

          if (msg?.caption !== undefined) {
            let updatedCaption = msg.caption;
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
              updatedCaption = updatedCaption.replace(
                /<i>Select an action below to update payment status:<\/i>/,
                `<b>🔒 [Status Locked: ${label}]</b>`
              );
            }

            await editTelegramMessageCaption({
              token: telegramToken,
              chatId,
              messageId,
              caption: updatedCaption,
              replyMarkup,
            });
          } else if (msg?.text) {
            let updatedText = msg.text;
            if (updatedText.includes("Payment Status:")) {
              updatedText = updatedText.replace(
                /Payment Status:.*(\n|$)/i,
                `Payment Status: ${label}$1`
              );
            } else {
              updatedText += `\n\nStatus: ${label}`;
            }

            if (action === "paid") {
              updatedText = updatedText.replace(
                /Baki \(Balance\):.*(\n|$)/i,
                `Baki (Balance): Rs. 0 (Fully Cleared ✅)$1`
              );
            }

            await editTelegramMessageText({
              token: telegramToken,
              chatId,
              messageId,
              text: updatedText,
              replyMarkup,
            });
          }

          // If marked Paid, send a separate confirmation message to the chat
          if (action === "paid") {
            await sendTelegramMessage({
              token: telegramToken,
              chatId,
              text:
                `🎉 <b>CONFIRMATION: Order marked as PAID!</b>\n\n` +
                `Order ID: <code>${orderId}</code> has been successfully marked as <b>Paid ✅</b>.\n` +
                `Full amount received. Buttons locked to prevent accidental changes.`,
              replyToMessageId: messageId,
            });
          }
        } catch (tgEditErr) {
          console.error("Failed to edit Telegram message:", tgEditErr);
        }

        return NextResponse.json({ ok: true, statusUpdatedTo: paymentStatus });
      }

      // Handle setsched_[orderId]_[dateText]
      if (data.startsWith("setsched_")) {
        const parts = data.split("_");
        const orderId = parts[1];
        const dateText = parts.slice(2).join("_");

        if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
          return NextResponse.json({ ok: false, error: "Invalid order ID" }, { status: 404 });
        }

        await connectToDatabase();
        await Order.findByIdAndUpdate(orderId, {
          status: "confirmed",
          paymentStatus: "Scheduled",
          scheduledDate: dateText,
        });

        // Edit the slot selection message to show the selected slot and remove buttons
        try {
          await editTelegramMessageText({
            token: telegramToken,
            chatId,
            messageId,
            text:
              `📅 <b>DELIVERY SCHEDULE CONFIRMED!</b>\n\n` +
              `Order ID: <code>${orderId}</code>\n` +
              `Scheduled Slot: <b>${dateText}</b> ✅\n` +
              `Database has been updated successfully.`,
            replyMarkup: { inline_keyboard: [] },
          });
        } catch (editErr) {
          console.warn("Could not edit sched prompt message:", editErr);
        }

        return NextResponse.json({ ok: true, case: "schedule_updated", orderId, scheduledDate: dateText });
      }
    }

    // =========================================================================
    // CASE C: HANDLING ADMIN REPLIES
    // =========================================================================
    if (message) {
      const msg = message;
      const text = (msg.text || "").trim();
      const replyToMsg = msg.reply_to_message;
      const chatId = msg.chat?.id;

      // Check if this message is a reply to our prompt:
      const replyPrompt = replyToMsg?.text || "";
      const match = replyPrompt.match(/Order ID:\s*([^\s\n]+)/i);

      if (match) {
        const orderId = match[1].trim();

        // 1. Check if replying to Schedule Delivery prompt
        if (
          replyPrompt.includes("SCHEDULE ORDER DELIVERY") ||
          replyPrompt.includes("SCHEDULE DELIVERY DATE") ||
          replyPrompt.toLowerCase().includes("slot")
        ) {
          if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
            await sendTelegramMessage({
              token: telegramToken,
              chatId,
              text: `⚠️ Order <code>${orderId}</code> is not stored in the database.`,
              replyToMessageId: msg.message_id,
            });
            return NextResponse.json({ ok: false, error: "Invalid order ID" }, { status: 404 });
          }

          await connectToDatabase();
          const dbOrder = await Order.findById(orderId);
          if (!dbOrder) {
            await sendTelegramMessage({
              token: telegramToken,
              chatId,
              text: `⚠️ Could not find order <code>${orderId}</code> in database.`,
              replyToMessageId: msg.message_id,
            });
            return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
          }

          const scheduledDate = text;
          await Order.findByIdAndUpdate(orderId, {
            status: "confirmed",
            paymentStatus: "Scheduled",
            scheduledDate,
          });

          await sendTelegramMessage({
            token: telegramToken,
            chatId,
            text:
              `📅 <b>DELIVERY SCHEDULED!</b>\n\n` +
              `Order ID: <code>${orderId}</code>\n` +
              `Customer: <b>${dbOrder.customer?.name || dbOrder.customer?.ownerName || "Customer"}</b>\n` +
              `Scheduled Delivery: <b>${scheduledDate}</b> ✅\n` +
              `Database has been updated successfully.`,
            replyToMessageId: msg.message_id,
          });

          return NextResponse.json({ ok: true, case: "schedule_updated_via_reply", orderId, scheduledDate });
        }

        // 2. Otherwise it is cash received partial payment reply
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

        if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
          await sendTelegramMessage({
            token: telegramToken,
            chatId,
            text: `⚠️ Order <code>${orderId}</code> is not stored in the database, so its payment cannot be updated.`,
            replyToMessageId: msg.message_id,
          });
          return NextResponse.json({ ok: false, error: "Order is not stored in the database" }, { status: 404 });
        }

        let orderTotal = 0;
        let customerName = "Customer";

        await connectToDatabase();
        const dbOrder = await Order.findById(orderId);
        if (!dbOrder) {
          await sendTelegramMessage({
            token: telegramToken,
            chatId,
            text: `⚠️ Could not find order <code>${orderId}</code> in the database. Payment was not updated.`,
            replyToMessageId: msg.message_id,
          });
          return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
        }

        orderTotal = Number(dbOrder.total) || 0;
        customerName = dbOrder.customer?.name || customerName;

        const bakiAmount = Math.max(0, orderTotal - paidNumber);
        const paymentStatus = bakiAmount === 0 ? "Paid" : "Partially Paid";

        await Order.findByIdAndUpdate(orderId, {
          paidAmount: paidNumber,
          bakiAmount,
          paymentStatus,
          status: bakiAmount === 0 ? "confirmed" : "pending",
        });

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

export async function GET(request: NextRequest) {
  if (!(await verifyAdminSession(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized access" }, { status: 401 });
  }

  const telegramToken = process.env.TELEGRAM_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const adminIds = (process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((id) => id.trim().replace(/^@/, ""))
    .filter(Boolean);

  const searchParams = request.nextUrl.searchParams;
  const shouldSetup = searchParams.get("setup") === "1" || searchParams.get("register") === "1";

  const targetWebhookUrl = `${request.nextUrl.origin}/api/telegram-webhook`;

  if (!telegramToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "TELEGRAM_TOKEN is missing in environment variables.",
      },
      { status: 500 }
    );
  }

  // Auto-setup: register this endpoint with Telegram Bot API
  if (shouldSetup) {
    return NextResponse.json(
      { ok: false, error: "Webhook setup requires an authenticated POST request." },
      { status: 405, headers: { Allow: "POST" } }
    );
  }

  // Diagnostic info
  let telegramWebhookInfo: any = null;
  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${telegramToken}/getWebhookInfo`);
    telegramWebhookInfo = await infoRes.json();
  } catch (err: any) {
    telegramWebhookInfo = { error: err?.message || "Could not reach Telegram getWebhookInfo" };
  }

  return NextResponse.json({
    status: "active",
    endpoint: targetWebhookUrl,
    time: new Date().toISOString(),
    envConfig: {
      hasTelegramToken: Boolean(telegramToken),
      hasTelegramChatId: Boolean(telegramChatId),
      hasWebhookSecret: Boolean(webhookSecret),
      adminIdsCount: adminIds.length,
    },
    telegramWebhookInfo,
    setupTip: `Send an authenticated POST request to ${targetWebhookUrl}?setup=1 while signed in as admin.`,
  });
}
