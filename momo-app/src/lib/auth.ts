import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const RECEIPT_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createReceiptAccessToken(orderId: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Session signing secret is not configured.");

  const expiresAt = Date.now() + RECEIPT_TOKEN_TTL_MS;
  const payload = `${orderId}|${expiresAt}`;
  const signature = createHmac("sha256", secret)
    .update(`customer-receipt|${payload}`)
    .digest("hex");

  return `${expiresAt}.${signature}`;
}

export function verifyReceiptAccessToken(orderId: string, token: string): boolean {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  const [expiresAtText, signature] = token.split(".");
  if (!/^\d{13}$/.test(expiresAtText || "") || !/^[a-f0-9]{64}$/i.test(signature || "")) {
    return false;
  }

  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || Date.now() >= expiresAt) return false;

  const payload = `${orderId}|${expiresAt}`;
  const expected = createHmac("sha256", secret)
    .update(`customer-receipt|${payload}`)
    .digest();
  const provided = Buffer.from(signature, "hex");

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

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
