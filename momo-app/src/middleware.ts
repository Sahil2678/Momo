import { NextRequest, NextResponse } from "next/server";

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return false;

  try {
    const payload = atob(b64);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expectedSig = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSig !== sig) return false;

    // Check expiry
    const [, expiresStr] = payload.split("|");
    if (!expiresStr) return false;
    return Date.now() < Number(expiresStr);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /dashboard routes (not /dashboard/login)
  if (!pathname.startsWith("/dashboard") || pathname.startsWith("/dashboard/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("momo_admin_session")?.value;
  const secret = process.env.SESSION_SECRET ?? "";

  const isValid = token ? await verifyToken(token, secret) : false;

  if (!isValid) {
    const loginUrl = new URL("/dashboard/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
