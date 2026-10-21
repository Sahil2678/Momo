import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { generateReceiptPDF } from "@/lib/receipt";
import { verifyAdminSession, verifyReceiptAccessToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const isDashboardReceipt = request.nextUrl.searchParams.get("dashboard") === "1";

    if (isDashboardReceipt && !(await verifyAdminSession(request))) {
      return NextResponse.json(
        { success: false, error: "Admin session required for paid dashboard receipts." },
        { status: 401 }
      );
    }

    if (
      !isDashboardReceipt &&
      !verifyReceiptAccessToken(id, request.headers.get("x-receipt-token") || "")
    ) {
      return NextResponse.json(
        { success: false, error: "A valid receipt access token is required." },
        { status: 401, headers: { "Cache-Control": "private, no-store" } }
      );
    }

    await connectToDatabase();
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (isDashboardReceipt && order.paymentStatus !== "Paid") {
      return NextResponse.json(
        { success: false, error: "A receipt is available in the dashboard only after payment is marked Paid." },
        { status: 409 }
      );
    }

    const dateFormatted = order.createdAt
      ? new Date(order.createdAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const pdfBuffer = await generateReceiptPDF({
      orderId: String(order._id),
      date: dateFormatted,
      customerName: order.customer.name || order.customer.ownerName || "Customer",
      phone: order.customer.phone,
      address: order.customer.address,
      items: order.items.map((it: any) => ({
        name: it.name,
        variant: it.variant,
        quantity: Number(it.quantity),
        price: Number(it.price),
      })),
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee || 0),
      total: Number(order.total),
      paymentStatus: isDashboardReceipt ? "Paid" : order.paymentStatus || "Pending",
    });

    const isDownload = request.nextUrl.searchParams.get("download") === "1";
    const disposition = isDownload ? "attachment" : "inline";

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="Receipt-${id}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Receipt generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate receipt.",
      },
      { status: 500 }
    );
  }
}
