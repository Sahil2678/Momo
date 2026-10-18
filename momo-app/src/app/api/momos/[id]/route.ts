import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Momo from "@/models/Momo";
import { verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PUT — update a momo by its custom `id` field (Protected)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectToDatabase();

    const updated = await Momo.findOneAndUpdate(
      { id },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Momo not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, momo: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update momo";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE — remove a momo by its custom `id` field (Protected)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();

    const deleted = await Momo.findOneAndDelete({ id });

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Momo not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Momo deleted successfully." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete momo";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
