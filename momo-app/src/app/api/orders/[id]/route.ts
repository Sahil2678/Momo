import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH — update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, scheduledDate, paymentStatus, paidAmount, bakiAmount } = body;

    const validStatuses = ["pending", "confirmed", "preparing", "delivered", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updateFields: Record<string, unknown> = {};
    if (status) updateFields.status = status;
    if (scheduledDate !== undefined) updateFields.scheduledDate = scheduledDate;
    if (paymentStatus !== undefined) updateFields.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) updateFields.paidAmount = paidAmount;
    if (bakiAmount !== undefined) updateFields.bakiAmount = bakiAmount;

    const updated = await Order.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update order";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE — remove an order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();

    const deleted = await Order.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Order deleted." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete order";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
