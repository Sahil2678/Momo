import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";

export const dynamic = "force-dynamic";

interface SubscriptionInput {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
}

function isValidSubscription(value: SubscriptionInput): value is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  return (
    typeof value.endpoint === "string" &&
    value.endpoint.startsWith("https://") &&
    value.endpoint.length <= 4096 &&
    typeof value.keys?.p256dh === "string" &&
    value.keys.p256dh.length <= 512 &&
    typeof value.keys.auth === "string" &&
    value.keys.auth.length <= 512
  );
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminSession(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body: SubscriptionInput = await request.json();
    if (!isValidSubscription(body)) {
      return NextResponse.json({ success: false, error: "Invalid push subscription." }, { status: 400 });
    }

    await connectToDatabase();
    await PushSubscriptionModel.updateOne(
      { endpoint: body.endpoint },
      { $set: { endpoint: body.endpoint, keys: body.keys } },
      { upsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscription save failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not save notification subscription." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdminSession(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body: SubscriptionInput = await request.json();
    if (typeof body.endpoint !== "string" || !body.endpoint.startsWith("https://")) {
      return NextResponse.json({ success: false, error: "Invalid push subscription endpoint." }, { status: 400 });
    }

    await connectToDatabase();
    await PushSubscriptionModel.deleteOne({ endpoint: body.endpoint });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscription removal failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not remove notification subscription." },
      { status: 500 }
    );
  }
}
