import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function signToken(payload: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const sig = hmac.digest("hex");
  return `${Buffer.from(payload).toString("base64")}.${sig}`;
}


// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    // Brute-force protection: Max 5 login attempts per 60s per IP
    const clientIp = getClientIp(request);
    const limiter = rateLimit(`admin_login_${clientIp}`, 5, 60000);
    if (!limiter.success) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please wait 1 minute." },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    const validUser = process.env.DASHBOARD_USERNAME;
    const validPass = process.env.DASHBOARD_PASSWORD;
    const secret = process.env.SESSION_SECRET;

    if (!validUser || !validPass || !secret) {
      return NextResponse.json(
        { success: false, error: "Server misconfiguration." },
        { status: 500 }
      );
    }

    if (username !== validUser || password !== validPass) {
      // Deliberate delay to slow brute-force
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json(
        { success: false, error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Create a signed session token: "username|expires"
    const expires = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
    const token = signToken(`${username}|${expires}`, secret);

    const response = NextResponse.json({ success: true });
    response.cookies.set("momo_admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours in seconds
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Auth error:", msg);
    return NextResponse.json(
      { success: false, error: msg || "Authentication failed." },
      { status: 500 }
    );
  }
}

// POST /api/auth/logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("momo_admin_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
