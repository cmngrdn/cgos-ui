/**
 * SMS link detection + segment math — the canonical copy.
 *
 * MOVED HERE FROM cmngrdn 2026-08-08 (was src/lib/comms/sms-link-detect.ts).
 * It lives in the design package for the same reason `lib/consent.ts` does:
 * it is canonical logic with a Python mirror, and more than one surface has to
 * agree with it exactly. The SMS thread composer and the transmission composer
 * are the same act on two screens, and until now only one of them knew what a
 * segment costs.
 *
 * `SMS_URL_RE` is a faithful mirror of the backend detector
 * (cgos `awen/link_tracking.py` `_URL_RE`) — what the composer flags as a link
 * MUST be exactly what the backend wraps into a tracked `/r/` link, so "what
 * you see = what gets sent". If you change one, change the other. Two branches:
 *   1. scheme/www links:  https://… | http://… | www.…
 *   2. schemeless w/ path: feather.fm/signal  (path REQUIRED — a bare
 *      "report.pdf" in prose must never be wrapped into a broken link)
 *
 * Segment math models the ACTUAL sent body: each detected URL is replaced by
 * the short tracked link the backend substitutes (~30 chars), so the operator
 * sees the real segment count, not the count of their long pasted URL.
 *
 * Pure — no imports, no DOM, no React. Asserted by `npm run audit:composer`.
 */

/** Mirror of cgos `_URL_RE`. `g` for iteration, `i` for IGNORECASE. */
export const SMS_URL_RE =
  /(?:https?:\/\/|www\.)[^\s<>"'()]+[^\s<>"'().,;:!?]|(?<![\w@./:-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\/[^\s<>"'()]*[^\s<>"'().,;:!?]/gi;

/**
 * Estimated length of the tracked link the backend substitutes for a detected
 * URL — `https://feather.fm/r/XXXXXXXX` (branded, 8-char token ≈ 29) or
 * `https://www.cmngrdn.com/t/XXXXXXXX` (canonical fallback ≈ 34). 30 is a
 * representative middle; SMS is aggregate-only (no per-recipient ?r= suffix),
 * so this stays small. Used only for the composer estimate.
 */
export const ESTIMATED_TRACKED_LINK_LEN = 30;

export interface DetectedLink {
  raw: string;
  start: number;
  end: number;
}

/** One row of the `/api/transmissions/check-links` response. */
export interface LinkCheckResult {
  ok: boolean;
  status: number | null;
  error: string | null;
  /** The scheme-normalized destination the backend actually fetched
   * (`feather.fm/x` → `https://feather.fm/x`). */
  normalized?: string | null;
}

/** Every URL the backend would wrap, in order. */
export function detectLinks(body: string): DetectedLink[] {
  if (!body) return [];
  const out: DetectedLink[] = [];
  for (const m of body.matchAll(SMS_URL_RE)) {
    if (m.index === undefined) continue;
    out.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/**
 * Tokens that LOOK like a link attempt but won't be auto-wrapped — a typo'd
 * scheme ("htp://", "http:/x" single-slash) or a "www." with no following host.
 * These would go out as dead plain text, so the checker flags them. Best-effort
 * heuristic; never throws.
 */
export function findMalformedLinks(body: string): string[] {
  if (!body) return [];
  const valid = new Set(detectLinks(body).map((l) => l.raw));
  const flagged: string[] = [];
  // Anything containing "://" or a leading "www." that the real detector missed.
  const candidateRe = /\S*(?::\/\/|www\.)\S*/gi;
  for (const m of body.matchAll(candidateRe)) {
    const tok = m[0];
    // Skip if it (or a link inside it) was validly detected.
    if (valid.has(tok)) continue;
    if ([...valid].some((v) => tok.includes(v))) continue;
    flagged.push(tok);
  }
  return flagged;
}

// ── GSM-7 vs UCS-2 segment math ─────────────────────────────────────────────

// GSM 03.38 basic alphabet — each char is one septet.
const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà".split(
    "",
  ),
);
// GSM extension chars — each costs two septets (an escape + the char).
const GSM_EXT = new Set("^{}\\[~]|€".split(""));

export type SmsEncoding = "GSM-7" | "UCS-2";

export interface SmsSegmentInfo {
  /** Effective length of the SENT body (URLs counted as tracked-link length). */
  effectiveLength: number;
  encoding: SmsEncoding;
  segments: number;
  /** Per-segment capacity for the detected encoding (single vs concatenated). */
  perSegment: number;
  /** Chars left before the next segment boundary. */
  remaining: number;
  linkCount: number;
}

/** The body the recipient actually receives: each URL → its tracked-link length. */
function effectiveBody(body: string, trackedLinkLen: number): string {
  if (!body) return "";
  return body.replace(SMS_URL_RE, "x".repeat(trackedLinkLen));
}

function gsmUnits(text: string): { units: number; isGsm: boolean } {
  let units = 0;
  for (const ch of text) {
    if (GSM_BASIC.has(ch)) units += 1;
    else if (GSM_EXT.has(ch)) units += 2;
    else return { units: 0, isGsm: false };
  }
  return { units, isGsm: true };
}

/**
 * Segment count for an SMS body, accounting for link-shortening + encoding.
 * GSM-7: 160 single / 153 concatenated. UCS-2 (any non-GSM char, e.g. emoji):
 * 70 single / 67 concatenated (UTF-16 code units).
 */
export function smsSegmentInfo(
  body: string,
  trackedLinkLen: number = ESTIMATED_TRACKED_LINK_LEN,
): SmsSegmentInfo {
  const eff = effectiveBody(body, trackedLinkLen);
  const linkCount = detectLinks(body).length;
  const gsm = gsmUnits(eff);

  let encoding: SmsEncoding;
  let length: number;
  let singleMax: number;
  let multiMax: number;
  if (gsm.isGsm) {
    encoding = "GSM-7";
    length = gsm.units;
    singleMax = 160;
    multiMax = 153;
  } else {
    encoding = "UCS-2";
    // UTF-16 code units (surrogate pairs = 2), matching how carriers count.
    length = eff.length;
    singleMax = 70;
    multiMax = 67;
  }

  let segments: number;
  let perSegment: number;
  if (length === 0) {
    segments = 0;
    perSegment = singleMax;
  } else if (length <= singleMax) {
    segments = 1;
    perSegment = singleMax;
  } else {
    segments = Math.ceil(length / multiMax);
    perSegment = multiMax;
  }
  const remaining = segments === 0 ? singleMax : segments * perSegment - length;

  return {
    effectiveLength: length,
    encoding,
    segments,
    perSegment,
    remaining,
    linkCount,
  };
}

// ── Encoding culprits: what forces UCS-2 (and how to fix it) ─────────────────
//
// A single non-GSM character flips the WHOLE message to UCS-2 (70 chars/segment
// instead of 160), so identifying + surfacing them is the highest-value readout
// on the composer. The common offenders are usually invisible: emoji, but also
// autocorrect's curly quotes, em/en dashes, ellipsis, and non-breaking spaces.

/** True if the code point is a single-septet GSM-7 char (basic or extension). */
export function isGsmSafeChar(ch: string): boolean {
  return GSM_BASIC.has(ch) || GSM_EXT.has(ch);
}

/**
 * Autocorrect / smart-typography characters that HAVE a clean GSM-7 equivalent.
 * `stripToGsm` swaps these in place; everything else non-GSM (emoji, exotic
 * symbols) is dropped since there's no faithful single-byte substitute.
 */
const TRANSLITERATE: Record<string, string> = {
  "‘": "'", // ' left single quote
  "’": "'", // ' right single quote / apostrophe
  "“": '"', // " left double quote
  "”": '"', // " right double quote
  "–": "-", // – en dash
  "—": "-", // — em dash
  "…": "...", // … ellipsis
  " ": " ", // non-breaking space
  "•": "-", // • bullet
  "·": "-", // · middle dot
};

/** Emoji "glue" code points — combine into the preceding emoji, not their own chip. */
const EMOJI_GLUE = /^[‍️\u{1F3FB}-\u{1F3FF}]$/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

function culpritLabel(ch: string): string {
  if (ch === "‘" || ch === "’" || ch === "“" || ch === "”")
    return "curly quote";
  if (ch === "–" || ch === "—") return "dash";
  if (ch === "…") return "ellipsis";
  if (ch === " ") return "non-breaking space";
  if (ch === "•" || ch === "·") return "bullet";
  if (PICTOGRAPHIC.test(ch) || EMOJI_GLUE.test(ch)) return "emoji";
  return "special character";
}

export interface EncodingCulprit {
  /** The offending character (rendered in the chip). */
  char: string;
  /** Friendly category — "emoji", "curly quote", "dash", … */
  label: string;
  /** How many times it appears in the body. */
  count: number;
  /** True when `stripToGsm` can transliterate it; false when it'd be dropped. */
  fixable: boolean;
}

/**
 * Deduped list of the characters forcing this body to UCS-2, most-frequent
 * first. Emoji "glue" (variation selectors, ZWJ, skin-tone modifiers) is folded
 * out of the chip list so we don't render an empty box. Returns [] for a
 * GSM-safe body.
 */
export function findEncodingCulprits(body: string): EncodingCulprit[] {
  if (!body) return [];
  const seen = new Map<string, EncodingCulprit>();
  for (const ch of body) {
    if (isGsmSafeChar(ch)) continue;
    if (EMOJI_GLUE.test(ch)) continue; // invisible combiner — counts toward UCS-2 but not a chip
    const prev = seen.get(ch);
    if (prev) {
      prev.count += 1;
    } else {
      seen.set(ch, {
        char: ch,
        label: culpritLabel(ch),
        count: 1,
        fixable: ch in TRANSLITERATE,
      });
    }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count);
}

/**
 * Rewrite a body to be GSM-7-safe: transliterate smart-typography chars, drop
 * everything else non-GSM (emoji + exotic symbols). Collapses the double-spaces
 * a dropped emoji can leave behind. This is the "strip to plain text" one-tap
 * fix — offered only when it actually lowers the segment count.
 */
export function stripToGsm(body: string): string {
  if (!body) return "";
  let out = "";
  for (const ch of body) {
    if (isGsmSafeChar(ch)) out += ch;
    else if (ch in TRANSLITERATE) out += TRANSLITERATE[ch];
    // else: drop (emoji, glue, exotic symbol)
  }
  return out.replace(/ {2,}/g, " ").replace(/ +\n/g, "\n");
}

// ── Sent-preview token stream — REMOVED 2026-08-08 ──────────────────────────
//
// `SmsPreviewToken` / `tokenizeRun` / `buildSmsPreviewTokens` lived here and
// fed a "How this sends" box under the SMS composer. That box is gone (see
// cmngrdn `SmsComposerHud.tsx` for the full reasoning) and these went with it
// rather than staying as an unused export in a shared package.
//
// The short version, because it generalises: a preview cannot show the fact it
// exists to convey. An emoji looks identical whether it costs one segment or
// two — what communicates the cost is the DETECTION saying so. And styled like
// the field above it, the preview read as a second input and operators typed
// into it. `findEncodingCulprits` still exists and is what the readout uses.
