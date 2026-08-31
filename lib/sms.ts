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

// ── The 1,600 ceiling, and the RCS rail ─────────────────────────────────────
//
// WHY THIS EXISTS. On 2026-08-31 a 3,194-character transmission was authored,
// previewed, and sent. The HUD reported "21 segments" — accurate, and useless,
// because it priced a message that could never leave. Twilio rejected the API
// call outright (error 21617), no Message resource was ever created, and the
// fanout recorded one failure whose reason it then discarded. The operator saw
// "it failed" and nothing else.
//
// The ceiling is a Twilio MESSAGES API limit, not a transport one, so it binds
// SMS and RCS identically. That is the whole reason it lives here in the engine
// beside the segment math rather than in one surface's readout: every surface
// that can send is subject to it, and the one that wasn't is the one that broke.

/**
 * Twilio's hard ceiling on the `Body` parameter — RAIL-INDEPENDENT.
 *
 * Exceeding it is error 21617 and the request 4xxs before a Message exists, so
 * unlike every other detection in the composer this is not a cost tradeoff an
 * operator may knowingly accept. It is an impossibility, which is why this is
 * the one number a surface is expected to GATE on rather than merely report.
 *
 * RCS does not segment — a 1,600-character RCS message arrives as one bubble
 * rather than eleven pieces — but it does not raise the ceiling either, and in
 * the US it is still billed per 160-character segment exactly like SMS. So the
 * rail changes how the message LANDS and how it READS; it changes neither what
 * fits nor what it costs.
 */
export const TWILIO_BODY_LIMIT = 1600;

export interface BodyLimitInfo {
  limit: number;
  /** Units on the STRICTEST rail — see `bodyLimitInfo` for why. */
  length: number;
  over: boolean;
  /** How many units must come out. 0 when within the limit. */
  excess: number;
}

/**
 * Is this body sendable at all?
 *
 * MEASURED ON THE EFFECTIVE BODY, NOT THE RAW ONE. The backend rewrites every
 * URL into a tracked link before Twilio sees a byte, so the raw text is the
 * wrong string to measure in both directions: three long pasted URLs can be
 * over the limit raw and comfortably under it as sent, and a handful of very
 * short links can be under raw and over once each becomes ~30 characters.
 * Gating on the raw body would block sends that would have succeeded and pass
 * sends that will fail — which is worse than not checking.
 *
 * MEASURED IN SEGMENT UNITS, WHICH IS THE STRICTER READING. Twilio's own note
 * on 21617 says characters outside GSM-7 "can use more space than standard GSM
 * characters and cause the message to exceed the limit sooner than expected" —
 * so the ceiling is counted in septets/UTF-16 units, not in visible characters.
 * `smsSegmentInfo` already computes exactly that number. Using it means a
 * UCS-2 body is judged on the measure Twilio will actually apply, and a
 * dual-rail send is judged on whichever rail binds first, which is this one.
 */
export function bodyLimitInfo(
  body: string,
  trackedLinkLen: number = ESTIMATED_TRACKED_LINK_LEN,
  limit: number = TWILIO_BODY_LIMIT,
): BodyLimitInfo {
  const length = smsSegmentInfo(body, trackedLinkLen).effectiveLength;
  const over = length > limit;
  return { limit, length, over, excess: over ? length - limit : 0 };
}

export interface RcsSegmentInfo {
  /** Code points of the sent body — RCS is UTF-8, so no surrogate arithmetic. */
  effectiveLength: number;
  /**
   * What the US carriers bill. RCS delivers unsegmented but is still charged
   * per 160-character segment domestically, so this is money even though the
   * recipient sees one message. International is billed per message.
   */
  billedSegments: number;
  linkCount: number;
}

/**
 * The RCS rail's numbers.
 *
 * DELIBERATELY NOT `smsSegmentInfo`. Until now `CHANNEL_DETECTORS` mapped
 * `rcs` straight at the SMS detector with the comment "same transport
 * economics until RCS billing says otherwise". Billing turned out to be the
 * half that IS the same; encoding is the half that is not, and pointing at the
 * SMS detector made the composer state two things about RCS that are false —
 * that an emoji forces a 70-character-per-segment Unicode mode (RCS is UTF-8;
 * it does not), and that stripping emoji would save money (it does not, and
 * would silently destroy content the rail carries perfectly well).
 */
export function rcsSegmentInfo(
  body: string,
  trackedLinkLen: number = ESTIMATED_TRACKED_LINK_LEN,
): RcsSegmentInfo {
  const eff = effectiveBody(body, trackedLinkLen);
  const effectiveLength = [...eff].length;
  return {
    effectiveLength,
    billedSegments: effectiveLength === 0 ? 0 : Math.ceil(effectiveLength / 160),
    linkCount: detectLinks(body).length,
  };
}

// ── Ways through the ceiling ────────────────────────────────────────────────
//
// A block with no exit is a nicer failure, not a fix. These are the two honest
// options for a body that cannot send, and they are here rather than in a
// surface because the measurement they have to satisfy lives here: a trim that
// cuts to 1,600 RAW characters can still be over the limit once its links are
// rewritten, so anything that produces a sendable body has to be able to ask
// the same question `bodyLimitInfo` answers.

/** The best cut ≤ limit, preferring paragraph > sentence > word > hard slice. */
function bestCut(body: string, limit: number, trackedLinkLen: number): number {
  const fits = (end: number) =>
    bodyLimitInfo(body.slice(0, end), trackedLinkLen, limit).length <= limit;

  for (const tier of [
    (b: string) => [...b.matchAll(/\n\n/g)].map((m) => m.index!),
    (b: string) => [...b.matchAll(/[.!?](?=\s|$)/g)].map((m) => m.index! + 1),
    (b: string) => [...b.matchAll(/\s/g)].map((m) => m.index!),
  ]) {
    const cuts = tier(body).filter((c) => c > 0);
    // Highest cut that still fits.
    for (let i = cuts.length - 1; i >= 0; i--) if (fits(cuts[i])) return cuts[i];
  }

  // No boundary fits — hard-slice. Shrink proportionally rather than by one
  // character at a time so a 40k paste doesn't cost 38k measurements.
  let end = Math.min(body.length, limit);
  while (end > 0 && !fits(end)) end = Math.max(0, end - Math.max(1, Math.ceil(end * 0.05)));
  return end;
}

/**
 * The longest prefix that will actually send, cut at the cleanest boundary.
 *
 * Prefers a paragraph break over a sentence over a word, because a message
 * that stops mid-thought reads as broken while one that stops at a paragraph
 * reads as short. Returns the body unchanged when it already fits, so it is
 * safe to call unconditionally.
 */
export function trimToBodyLimit(
  body: string,
  limit: number = TWILIO_BODY_LIMIT,
  trackedLinkLen: number = ESTIMATED_TRACKED_LINK_LEN,
): string {
  if (!body || !bodyLimitInfo(body, trackedLinkLen, limit).over) return body;
  return body.slice(0, bestCut(body, limit, trackedLinkLen)).trimEnd();
}

/**
 * Fill toward an EVENLY RE-COMPUTED target, never exceeding `hardLimit`.
 *
 * The target is recomputed from what is LEFT on every pass, not fixed up front.
 * A fixed target leaves the final part holding whatever remains — measured on
 * the body that prompted this, a fixed target gave 901 / 870 / 1,405 while
 * re-targeting gives three comparable parts. The last part is exactly the one a
 * fixed target cannot control, because by then there is nothing after it to
 * borrow from.
 */
function balancedSplit(
  body: string,
  n: number,
  hardLimit: number,
  trackedLinkLen: number,
): string[] {
  const parts: string[] = [];
  let rest = body;
  // Bounded: `bestCut` returns ≥1 for non-empty input, so each pass consumes at
  // least one character. The guard only exists so a pathological limit cannot
  // spin forever.
  let guard = 0;
  while (bodyLimitInfo(rest, trackedLinkLen, hardLimit).over && guard++ < 500) {
    const remaining = bodyLimitInfo(rest, trackedLinkLen, hardLimit).length;
    const left = Math.max(1, n - parts.length);
    // Clamped: once `left` hits 1 the even target is the whole remainder, which
    // is the one value that must not be allowed past the ceiling.
    const target = Math.min(hardLimit, Math.ceil(remaining / left));
    const cut = Math.max(1, bestCut(rest, target, trackedLinkLen));
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trimStart();
    if (!rest) break;
  }
  if (rest.trim()) parts.push(rest.trim());
  return parts.length ? parts : [body];
}

/**
 * Break a too-long body into parts that each send.
 *
 * BALANCED, NOT GREEDY — and the difference is visible to the recipient.
 * Filling each part to the ceiling before starting the next produced
 * 1,555 + 1,593 + 28 on the message that prompted this: two dense walls and a
 * third text containing only a sign-off. Splitting toward an even TARGET
 * instead gives three comparable parts. So the search is over part COUNT: take
 * the fewest parts the ceiling allows, aim each at `total / n`, and accept the
 * first `n` whose clean-boundary split actually lands in `n` parts.
 *
 * It can need more parts than the arithmetic minimum, because boundaries do
 * not fall where arithmetic wants them. That is the deliberate trade: a break
 * mid-sentence to save one message reads worse than the extra message.
 *
 * NO "(1/3)" MARKERS. Numbering changes the operator's words, and its length is
 * length this function has just finished accounting for — a marker appended
 * afterwards can push a part back over the ceiling, silently, which is the
 * exact failure being fixed. A surface that wants numbering adds it BEFORE
 * splitting, so it is measured like everything else.
 *
 * Always returns at least one part; returns `[body]` unchanged when it fits.
 */
export function splitForBodyLimit(
  body: string,
  limit: number = TWILIO_BODY_LIMIT,
  trackedLinkLen: number = ESTIMATED_TRACKED_LINK_LEN,
): string[] {
  if (!body.trim()) return [body];
  const total = bodyLimitInfo(body, trackedLinkLen, limit).length;
  if (total <= limit) return [body];

  const minParts = Math.ceil(total / limit);
  // A few extra tries, then give up on balance and just fill. Three is enough
  // for any realistic body: each extra part lowers the target by a whole
  // fraction of the total, which frees the boundary search considerably.
  for (let n = minParts; n <= minParts + 3; n++) {
    const parts = balancedSplit(body, n, limit, trackedLinkLen);
    if (parts.length <= n) return parts;
  }
  return balancedSplit(body, minParts + 3, limit, trackedLinkLen);
}
