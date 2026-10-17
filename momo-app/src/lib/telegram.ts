/**
 * Utility functions for Telegram Bot API integration
 */

export interface TelegramInlineButton {
  text: string;
  callback_data: string;
}

export function getOrderKeyboard(orderId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Paid", callback_data: `status_paid_${orderId}` },
        { text: "📅 Scheduled", callback_data: `status_sched_${orderId}` },
      ],
      [
        { text: "💵 Part Paid", callback_data: `status_part_${orderId}` },
        { text: "⏳ Pending", callback_data: `status_pend_${orderId}` },
      ],
    ],
  };
}

export async function sendTelegramDocument({
  token,
  chatId,
  documentBuffer,
  fileName,
  caption,
  replyMarkup,
}: {
  token: string;
  chatId: string;
  documentBuffer: Buffer;
  fileName: string;
  caption: string;
  replyMarkup?: object;
}): Promise<any> {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", caption);
  formData.append("parse_mode", "HTML");

  if (replyMarkup) {
    formData.append("reply_markup", JSON.stringify(replyMarkup));
  }

  const blob = new Blob([new Uint8Array(documentBuffer)], { type: "application/pdf" });
  formData.append("document", blob, fileName);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  const result = await res.json();
  if (!res.ok || result.ok !== true) {
    throw new Error(result.description || `Telegram sendDocument failed with status ${res.status}`);
  }
  return result;
}

export async function sendTelegramMessage({
  token,
  chatId,
  text,
  replyMarkup,
  replyToMessageId,
}: {
  token: string;
  chatId: string | number;
  text: string;
  replyMarkup?: object;
  replyToMessageId?: number;
}): Promise<any> {
  const body: Record<string, any> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };

  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  if (replyToMessageId) {
    body.reply_to_message_id = replyToMessageId;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await res.json();
  if (!res.ok || result.ok !== true) {
    throw new Error(result.description || `Telegram sendMessage failed with status ${res.status}`);
  }
  return result;
}

export async function editTelegramMessageText({
  token,
  chatId,
  messageId,
  text,
  replyMarkup,
}: {
  token: string;
  chatId: string | number;
  messageId: number;
  text: string;
  replyMarkup?: object;
}): Promise<any> {
  const body: Record<string, any> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup !== undefined) {
    body.reply_markup = replyMarkup;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return await res.json();
}

export async function editTelegramMessageCaption({
  token,
  chatId,
  messageId,
  caption,
  replyMarkup,
}: {
  token: string;
  chatId: string | number;
  messageId: number;
  caption: string;
  replyMarkup?: object;
}): Promise<any> {
  const body: Record<string, any> = {
    chat_id: chatId,
    message_id: messageId,
    caption,
    parse_mode: "HTML",
  };
  if (replyMarkup !== undefined) {
    body.reply_markup = replyMarkup;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return await res.json();
}

export async function answerTelegramCallbackQuery(token: string, callbackQueryId: string, text?: string): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
    }),
  });

  return await res.json();
}
