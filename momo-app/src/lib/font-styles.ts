/**
 * Stylish font generators and normalizer
 */

const HACKER_MAP: Record<string, string> = {
  a: "ʌ", b: "в", c: "ƈ", d: "ɖ", e: "є", f: "ғ", g: "ɢ", h: "н", i: "ι", j: "ʝ",
  k: "к", l: "ɭ", m: "ɱ", n: "η", o: "σ", p: "ρ", q: "φ", r: "ʀ", s: "ѕ", t: "т",
  u: "υ", v: "ν", w: "ω", x: "х", y: "у", z: "ᴢ",
  A: "A", B: "B", C: "C", D: "D", E: "E", F: "F", G: "G", H: "H", I: "I", J: "J",
  K: "K", L: "L", M: "M", N: "N", O: "O", P: "P", Q: "Q", R: "R", S: "S", T: "T",
  U: "U", V: "V", W: "W", X: "X", Y: "Y", Z: "Z"
};

const SCRIPT_OFFSET_LOWER = 0x1d4ea; // 𝒶
const SCRIPT_OFFSET_UPPER = 0x1d4d0; // 𝒜

const DOUBLE_STRUCK_LOWER = 0x1d55c; // 𝕒
const DOUBLE_STRUCK_UPPER = 0x1d542; // 𝔸

const SMALL_CAPS_MAP: Record<string, string> = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ",
  k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ѕ", t: "ᴛ",
  u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ"
};

const BUBBLE_OFFSET_LOWER = 0x24d0; // ⓐ
const BUBBLE_OFFSET_UPPER = 0x24b6; // Ⓐ

// Reverse map for normalizing special fonts back to standard ASCII
const REVERSE_MAP: Record<string, string> = {};
for (const [plain, fancy] of Object.entries(HACKER_MAP)) {
  REVERSE_MAP[fancy] = plain;
}
for (const [plain, fancy] of Object.entries(SMALL_CAPS_MAP)) {
  REVERSE_MAP[fancy] = plain;
}

export interface FontStyleOption {
  id: string;
  label: string;
  preview: string;
}

export function generateFontStyles(name: string): FontStyleOption[] {
  const clean = name.trim();
  if (!clean) return [];

  // 1. Hacker / Greek (like in user screenshot: Sʌнιɭ Kυɱʌʀ)
  const hacker = clean
    .split("")
    .map((c) => HACKER_MAP[c] || c)
    .join("");

  // 2. Bold Script / Cursive
  const script = clean
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 97 && code <= 122) return String.fromCodePoint(SCRIPT_OFFSET_LOWER + (code - 97));
      if (code >= 65 && code <= 90) return String.fromCodePoint(SCRIPT_OFFSET_UPPER + (code - 65));
      return c;
    })
    .join("");

  // 3. Double Struck / Aesthetic
  const doubleStruck = clean
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 97 && code <= 122) return String.fromCodePoint(DOUBLE_STRUCK_LOWER + (code - 97));
      if (code >= 65 && code <= 90) return String.fromCodePoint(DOUBLE_STRUCK_UPPER + (code - 65));
      return c;
    })
    .join("");

  // 4. Small Caps
  const smallCaps = clean
    .split("")
    .map((c) => SMALL_CAPS_MAP[c.toLowerCase()] || c)
    .join("");

  // 5. Bubble / Circled
  const bubble = clean
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      if (code >= 97 && code <= 122) return String.fromCodePoint(BUBBLE_OFFSET_LOWER + (code - 97));
      if (code >= 65 && code <= 90) return String.fromCodePoint(BUBBLE_OFFSET_UPPER + (code - 65));
      return c;
    })
    .join("");

  // 6. Royal VIP Wings
  const royal = `꧁ ${clean} ꧂`;

  // 7. Cool Stars
  const stars = `★彡 ${clean} 彡★`;

  return [
    { id: "hacker", label: "Special Hacker (Sʌнιɭ)", preview: hacker },
    { id: "script", label: "Bold Cursive (𝓢𝓪𝓱𝓲𝓵)", preview: script },
    { id: "double", label: "Double Struck (𝕊𝕒𝕙𝕚𝕝)", preview: doubleStruck },
    { id: "smallcaps", label: "Small Caps (ꜱᴀʜɪʟ)", preview: smallCaps },
    { id: "bubble", label: "Bubble Circle (Ⓢⓐⓗⓘⓛ)", preview: bubble },
    { id: "royal", label: "Royal Wings", preview: royal },
    { id: "stars", label: "Cool Stars", preview: stars },
  ];
}

/**
 * Normalizes special unicode fonts back to readable plain ASCII English.
 * Useful for PDF rendering, receipt generation, and search indexing.
 */
export function normalizeSpecialFont(str: string): string {
  if (!str) return "";
  let out = "";
  for (const char of str) {
    if (REVERSE_MAP[char]) {
      out += REVERSE_MAP[char];
    } else {
      // Normalize unicode compatibility decomposed form (NFKD)
      const normalized = char.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      out += normalized || char;
    }
  }
  return out.replace(/[^\x20-\x7E]/g, (match) => {
    // If it's still non-ascii, return the reverse map if available or keep
    return REVERSE_MAP[match] || match;
  });
}
