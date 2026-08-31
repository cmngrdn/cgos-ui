/**
 * Render an operator-authored SMS body. MIRROR of `awen/sms_body.py`.
 *
 * WHY A MIRROR AND NOT A FETCH. The Composer's readout has to be live as she
 * types, and it must measure the RENDERED text — `{service}` is 9 characters,
 * "6 Hour Session" is 14, so a segment count taken on the template is a
 * different number from the one that gets billed. A debounced round-trip per
 * keystroke would make the one number she is watching lag the box she is typing
 * in. So the same function exists twice, and `tests/test_sms_body_mirror.py`
 * runs both against one fixture — the pattern `consent.py`/`consent.ts` and
 * `surface_grants.py`/`surface-grants.ts` already use here.
 *
 * Keep the two byte-equivalent. A preview that disagrees with the send is worse
 * than no preview: it is a settings box that lies with a number attached.
 */

// GSM-7 default alphabet. One character outside it forces the WHOLE message to
// UCS-2 and cuts the budget from 160 characters per segment to 70 — which is
// how an em-dash in a default template silently doubled the cost of every
// reminder before anything counted it.
const GSM = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡" +
    "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà",
)
// Each of these costs TWO septets (an escape byte, then the character).
const GSM_EXT = new Set("^{}\\[~]|€")

// BOTH BRACE STYLES, DOUBLES FIRST — mirrors `awen/sms_body.py` exactly, and
// `test_sms_body_mirror.py` is what keeps them one thing. Ordering matters:
// singles first would turn `{{service}}` into `{6 Hour Session}` and leave a
// stray brace. `{single}` is the canon; `{{double}}` is accepted so an operator
// who learned it on crew's system emails cannot silently get it wrong here.
const TAG = /\{\{\s*([a-z_]+)\s*\}\}|\{([a-z_]+)\}/g
const SENTENCE_END = ".!?"

/** merge tag -> the key the booking template data already carries. */
export const BOOKING_TAGS: Record<string, string> = {
  brand: "artist_name",
  service: "service_name",
  date: "date_formatted",
  time: "time_formatted",
  timing: "timing_label",
  location: "location",
  first_name: "first_name",
  reschedule_url: "reschedule_url",
  cancel_url: "cancel_url",
  review_url: "review_link_url",
}

/** The moments a booking can text about, and the column each body lives in. */
export const SMS_BODY_COLUMNS = {
  confirmation: "confirmation_sms_body",
  cancel: "cancel_sms_body",
  reminder: "reminder_sms_body",
  day_of: "day_of_sms_body",
  followup: "followup_sms_body",
} as const

export type SmsMoment = keyof typeof SMS_BODY_COLUMNS

/**
 * Substitute {tags} and tidy. Empty template -> '' meaning SEND NOTHING.
 *
 * An UNKNOWN tag is left verbatim on purpose: blanking `{reschedul_url}` would
 * delete half a sentence and read as correct in the preview, so a typo has to
 * look like a typo while she can still see it.
 */
export function renderSmsBody(
  template: string | null | undefined,
  context: Record<string, unknown>,
): string {
  if (!template || !template.trim()) return ""

  let out = template.replace(TAG, (whole, dbl: string, sgl: string) => {
    // Exactly one branch ever matches.
    const key = dbl || sgl
    if (!(key in context)) return whole
    const val = context[key]
    return val === null || val === undefined ? "" : String(val).trim()
  })

  out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+\n/g, "\n").trim()
  return dropStrandedTail(out)
}

/**
 * Drop a trailing clause left pointing at nothing by an empty tag.
 *
 * "…leave a review: {review_url}" with no link must not ship as
 * "…leave a review:". The unit dropped is the whole CLAUSE back to the last
 * sentence boundary — stripping only the label leaves "If you have a moment,",
 * which is worse than either. Anchored to the end and requires a trailing
 * colon, so "Note: bring ID." is untouched.
 */
function dropStrandedTail(input: string): string {
  let out = input
  let prev: string | null = null
  while (prev !== out) {
    prev = out
    let cut = -1
    for (const c of SENTENCE_END) cut = Math.max(cut, out.lastIndexOf(c))
    const tail = out.slice(cut + 1).trim()
    if (tail && tail.endsWith(":")) out = cut >= 0 ? out.slice(0, cut + 1).trim() : ""
  }
  return out
}

/** 'GSM-7' or 'UCS-2' — which alphabet the carrier will use. */
export function smsEncoding(body: string): "GSM-7" | "UCS-2" {
  for (const c of body) if (!GSM.has(c) && !GSM_EXT.has(c)) return "UCS-2"
  return "GSM-7"
}

/** Billable segment count. Twilio charges PER SEGMENT, so this is money. */
export function smsSegments(body: string): number {
  if (!body) return 0
  if (smsEncoding(body) === "GSM-7") {
    let units = 0
    for (const c of body) units += GSM_EXT.has(c) ? 2 : 1
    return units <= 160 ? 1 : Math.ceil(units / 153)
  }
  // ⚠️ UTF-16 CODE UNITS, NOT CODE POINTS — `body.length`, never
  // `[...body].length`. A carrier counts a UCS-2 segment in 16-bit units, so a
  // non-BMP character (every emoji) is a surrogate pair costing TWO. Spreading
  // the string iterates code points and reported half the real cost: 40 emoji
  // measured 40 against a 70-unit budget (1 segment) when the truth is 80 (2).
  //
  // Invisible for two years because only a non-BMP character separates the two
  // readings and the shared fixture had none. `lib/sms.ts` was right all along.
  const units = body.length
  return units <= 70 ? 1 : Math.ceil(units / 67)
}

/** What the editor shows under the box. */
export function describeSms(body: string) {
  return {
    // CODE POINTS here, deliberately unlike `smsSegments` above. This is the
    // human-facing count — what the operator typed — so one emoji is one
    // character even though it costs two units of segment budget. Python's
    // `len()` is code points, so `[...body].length` is what keeps the mirror
    // exact; `body.length` diverged silently, unasserted, until 2026-08-31.
    characters: [...body].length,
    encoding: smsEncoding(body),
    segments: smsSegments(body),
    empty: !body.trim(),
  }
}

/** Project booking template data onto the merge-tag vocabulary. */
export function bookingSmsContext(
  templateData: Record<string, unknown>,
): Record<string, unknown> {
  const td = templateData || {}
  const out: Record<string, unknown> = {}
  for (const [tag, key] of Object.entries(BOOKING_TAGS)) out[tag] = td[key] ?? ""
  return out
}
