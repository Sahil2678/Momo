import { NextResponse } from "next/server";
import { configureWebPush } from "@/lib/web-push";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const publicKey = configureWebPush();
    return NextResponse.json({ success: true, publicKey });
  } catch (error) {
    console.error("Web Push configuration error:", error);
    return NextResponse.json(
      { success: false, error: "Background notifications are not configured on the server." },
      { status: 503 }
    );
  }
}
