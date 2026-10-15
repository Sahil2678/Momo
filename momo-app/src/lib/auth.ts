import { NextRequest } from "next/server";

export async function verifyAdminSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("momo_admin_session")?.value;
  const secret = process.env.SESSION_SECRET;

  if (!token || !secret) return false;

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
