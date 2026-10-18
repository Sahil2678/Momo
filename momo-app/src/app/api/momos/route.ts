import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Momo from "@/models/Momo";
import { verifyAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET all momos from MongoDB
export async function GET() {
  try {
    await connectToDatabase();

    const momos = await Momo.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, count: momos.length, momos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to retrieve momos";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST — create a new momo (Protected)
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id, name, tagline, description, price, wholesalePricePerPiece, pieces,
      spiceLevel, category, badge, isVeg, image, ingredients,
    } = body;

    if (!id || !name || !tagline || !description || !price || !pieces || !spiceLevel || !category || !image) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existing = await Momo.findOne({ id });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A momo with id "${id}" already exists.` },
        { status: 409 }
      );
    }

    const newMomo = await Momo.create({
      id, name, tagline, description,
      price: Number(price),
      wholesalePricePerPiece:
        wholesalePricePerPiece !== undefined && !isNaN(Number(wholesalePricePerPiece))
          ? Number(wholesalePricePerPiece)
          : 3,
      pieces: Number(pieces),
      spiceLevel, category,
      badge: badge || undefined,
      isVeg: Boolean(isVeg),
      image,
      ingredients: Array.isArray(ingredients) ? ingredients : [],
    });

    return NextResponse.json({ success: true, momo: newMomo }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create momo";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
