import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { generateReceiptPDF } from "@/lib/receipt";
import { sendTelegramDocument, getOrderKeyboard } from "@/lib/telegram";
import { appendOrderToSheet } from "@/lib/sheetbest";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Production Security: Rate Limiting (max 10 orders per 60 seconds per IP to block bot flood scripts)
    const clientIp = getClientIp(request);
    const limiter = rateLimit(`order_submit_${clientIp}`, 10, 60000);
    if (!limiter.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down and try again shortly." },
        { status: 429, headers: { "Retry-After": String(limiter.reset) } }
      );
    }

    const body = await request.json();
    const { customer, items, subtotal, deliveryFee = 0, total } = body;

    // Validate customer details
    const customerName = (customer?.name || customer?.ownerName || "").trim();
    const customerPhone = (customer?.phone || "").trim();
    const customerAddress = (customer?.address || "").trim();
    const customerBusiness = (customer?.businessName || "").trim();

    if (!customer || !customerName || !customerPhone || !customerAddress) {
      return NextResponse.json(
        { success: false, error: "Please provide your Name, Phone Number, and Delivery Address." },
        { status: 400 }
      );
    }

    // Validate phone number format (basic check)
    const phoneClean = customerPhone.replace(/[\s-]/g, "");
    if (phoneClean.length < 8) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid phone number (at least 8 digits)." },
        { status: 400 }
      );
    }

    // Validate cart items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Your order must contain at least one item." },
        { status: 400 }
      );
    }

    const totalPieces = items.reduce(
      (sum: number, item: { quantity?: number }) => sum + Number(item.quantity ?? 0),
      0
    );

    const orderType = totalPieces >= 500 ? "bulk" : "retail";

    // Validate quantities & prices
    for (const item of items) {
      if (!item.name || typeof item.price !== "number" || typeof item.quantity !== "number" || item.quantity < 1) {
        return NextResponse.json(
          { success: false, error: "Invalid item data in order." },
          { status: 400 }
        );
      }
    }

    // 1. Create order in MongoDB (Local/Persistent Next.js DB)
    let newOrder: any = null;
    try {
      await connectToDatabase();
      newOrder = await Order.create({
        customer: {
          name: customerName,
          ownerName: customerName,
          businessName: customerBusiness || undefined,
          phone: customerPhone,
          address: customerAddress,
        },
        items,
        totalPieces,
        orderType,
        subtotal: Number(subtotal),
        deliveryFee: Number(deliveryFee),
        total: Number(total),
        paidAmount: 0,
        bakiAmount: Number(total),
        paymentStatus: "Pending",
        status: "pending",
      });
    } catch (dbErr) {
      console.error("MongoDB save error (continuing with generated order id):", dbErr);
    }

    const orderId = newOrder?._id
      ? String(newOrder._id)
      : `ORD-${Date.now().toString().slice(-6)}`;

    const dateFormatted = new Date().toISOString().split("T")[0];
    const totalAmount = Number(total);

    // 2. Generate PDF Receipt using pdfkit
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateReceiptPDF({
        orderId,
        date: dateFormatted,
        customerName,
        phone: customerPhone,
        address: customerAddress,
        items: items.map((it: any) => ({
          name: it.name,
          variant: it.variant,
          quantity: Number(it.quantity),
          price: Number(it.price),
        })),
        subtotal: Number(subtotal),
        deliveryFee: Number(deliveryFee),
        total: totalAmount,
        paymentStatus: "Pending",
      });
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr);
    }

    // 3. Send Telegram Alert with PDF document & 4 Inline Keyboard Buttons
    const telegramToken = process.env.TELEGRAM_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (telegramToken && telegramChatId && pdfBuffer) {
      try {
        const itemLines = items
          .map((i: any) => `• ${i.name} (${i.variant || "Standard"}) x${i.quantity} @ Rs.${i.price}`)
          .join("\n");

        const caption =
          `🥟 <b>NEW WHOLESALE ORDER RECEIVED!</b>\n\n` +
          `<b>Order ID:</b> <code>${orderId}</code>\n` +
          `<b>Customer:</b> ${customerName}${customerBusiness ? ` (${customerBusiness})` : ""}\n` +
          `<b>Phone:</b> ${customerPhone}\n` +
          `<b>Address:</b> ${customerAddress}\n` +
          `<b>Items:</b>\n${itemLines}\n\n` +
          `<b>Total Amount:</b> Rs. ${totalAmount.toLocaleString()}\n` +
          `<b>Payment Status:</b> ⏳ Pending\n` +
          `<b>Baki (Balance):</b> Rs. ${totalAmount.toLocaleString()}\n\n` +
          `<i>Select an action below to update payment status:</i>`;

        const replyMarkup = getOrderKeyboard(orderId);

        await sendTelegramDocument({
          token: telegramToken,
          chatId: telegramChatId,
          documentBuffer: pdfBuffer,
          fileName: `Receipt-${orderId}.pdf`,
          caption,
          replyMarkup,
        });
      } catch (tgErr) {
        console.error("Telegram alert failed:", tgErr);
      }
    } else {
      if (!telegramToken || !telegramChatId) {
        console.warn("TELEGRAM_TOKEN or TELEGRAM_CHAT_ID not configured; skipping Telegram notification.");
      }
    }

    // 4. Push data to Google Sheets via Sheet.best POST request
    const sheetBestUrl = process.env.SHEET_BEST_URL;
    if (sheetBestUrl) {
      try {
        await appendOrderToSheet(sheetBestUrl, {
          Date: dateFormatted,
          Order_ID: orderId,
          Name: customerName,
          Phone: customerPhone,
          Total: totalAmount,
          Paid_Amount: 0,
          Baki_Amount: totalAmount,
          Payment_Status: "Pending",
        });
      } catch (sheetErr) {
        console.error("Sheet.best sync failed:", sheetErr);
      }
    } else {
      console.warn("SHEET_BEST_URL not configured; skipping Sheet.best logging.");
    }

    return NextResponse.json(
      {
        success: true,
        message: "Order placed successfully! Momo is being freshly prepared.",
        orderId,
        order: newOrder,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Order submit route error:", error);
    const message = error instanceof Error ? error.message : "Failed to process order. Please try again.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

import { verifyAdminSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    await connectToDatabase();
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100);
    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve orders";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
