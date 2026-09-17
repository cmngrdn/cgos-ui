/**
 * RCS rich card — the shape stored in `transmissions.rcs_card`, and its rules.
 *
 * MIRROR of the cgos contract (`docs/two-way-messaging-plan.md` §4). cgos
 * validates the same card before it creates a Twilio `twilio/card` template;
 * this copy exists so a composer can say what is wrong WHILE the operator is
 * typing, instead of at Send. If the two disagree, cgos wins and this is the
 * bug.
 *
 * The card is ONE extra rail on an SMS send, never a replacement: `body_sms`
 * is the `twilio/text` fallback every non-RCS phone receives. NULL means no
 * card, and the send is exactly the plain path.
 *
 * `auto` is composer state, not Twilio state: TRUE while the card still
 * follows the link in the message (a changed link rebuilds it), FALSE once a
 * human has edited any field. cgos ignores it.
 *
 * `off: true` is a card the operator switched off: its fields are kept so
 * switching it back on restores them, and it is neither sent nor validated.
 * NULL still means "never built" — the only state a composer auto-builds in.
 *
 * Mirrors cgos `rcs_content.card_problem` (shape) and `send_problem` (what
 * only matters at send: keyword titles, merge tags). A reply button's
 * `needs_reply` (absent = true) feeds only the inbox's "Needs reply" filter.
 */

import { OPT_IN_KEYWORDS, STOP_KEYWORDS } from './legal'

export type RcsButtonType = 'reply' | 'url' | 'call'
export type RcsCardHeight = 'SHORT' | 'MEDIUM' | 'TALL'
export type RcsCardOrientation = 'VERTICAL' | 'HORIZONTAL'

export interface RcsCardButton {
  /** `[a-z0-9_-]{1,32}`, unique in the card. Comes back as the inbound
   *  ButtonPayload for a reply button, so it is an identifier, not copy. */
  id: string
  /** What the phone shows. At most 20 characters. */
  title: string
  type: RcsButtonType
  /** https URL for `url`, E.164 for `call`, unused for `reply`. */
  value?: string
  /**
   * Reply buttons only. Does a tap on this button put the conversation in the
   * inbox's "Needs reply" filter? Absent means YES. Taps always show in the
   * thread and in "who answered"; this decides only the filter. cgos refuses
   * it on a link or call button (plan §13).
   */
  needs_reply?: boolean
}

export interface RcsCard {
  auto?: boolean
  off?: boolean
  media_url?: string
  title?: string
  body?: string
  orientation?: RcsCardOrientation
  height?: RcsCardHeight
  buttons: RcsCardButton[]
}

export const RCS_CARD_LIMITS = {
  buttons: 4,
  urlButtons: 2,
  buttonTitle: 20,
  title: 200,
  body: 1600,
  id: 32,
} as const

export const RCS_BUTTON_ID_RE = /^[a-z0-9_-]{1,32}$/

/**
 * Card media height in dp, per Google's RBM spec. Google CENTRE-CROPS the
 * image to this height, so a preview that shows the whole image is lying about
 * what the phone draws.
 */
export const RCS_MEDIA_HEIGHT_DP: Record<RcsCardHeight, number> = {
  SHORT: 112,
  MEDIUM: 168,
  TALL: 264,
}

/**
 * The nominal width of a standalone vertical card, in dp. Only the RATIO to
 * the media height matters for a preview; 296dp is the medium card width in
 * the same spec, and it makes TALL nearly square, which is why TALL is the
 * default for 1:1 release art.
 */
export const RCS_CARD_WIDTH_DP = 296

export const RCS_CARD_DEFAULTS = {
  orientation: 'VERTICAL' as RcsCardOrientation,
  height: 'TALL' as RcsCardHeight,
}

export const RCS_BUTTON_TYPE_LABEL: Record<RcsButtonType, string> = {
  url: 'Link',
  reply: 'Reply',
  call: 'Call',
}

export function isHttpsUrl(v: string | null | undefined): boolean {
  if (!v) return false
  try {
    const u = new URL(v.trim())
    return u.protocol === 'https:' && !!u.hostname
  } catch {
    return false
  }
}

/** cgos `_E164`: a plus, then 8 to 15 digits. */
export function isE164(v: string | null | undefined): boolean {
  return /^\+[1-9]\d{7,14}$/.test((v ?? '').trim())
}

/**
 * Texts that ACT when they arrive: opt-out, opt-in and HELP. A reply button's
 * title comes back as the message text, so a button titled "Cancel" would opt
 * the person out of every text. cgos `NON_REPLY_KEYWORDS`.
 */
export const REPLY_RESERVED_WORDS: ReadonlySet<string> = new Set([
  ...STOP_KEYWORDS,
  ...OPT_IN_KEYWORDS,
  'HELP',
])

/**
 * The tags a CARD send fills in (as Content variables; a missing first name
 * becomes "there"). The plain SMS path fills NONE, so on a text-only send
 * `{first_name}` goes out as typed. cgos `rcs_content.MERGE_TAGS`.
 */
export const RCS_MERGE_TAGS = ['first_name', 'workspace_name'] as const

/**
 * The image types a card can carry. cgos HEADs the image before it builds a
 * template and refuses anything else (`rcs_content._IMAGE_TYPES`), so a WebP
 * page image is a send that fails at the button.
 */
export const RCS_IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']

const IMAGE_TYPE_NAME: Record<string, string> = {
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
  'image/svg+xml': 'SVG',
  'image/bmp': 'BMP',
  'image/tiff': 'TIFF',
  'image/x-icon': 'an icon',
  'image/vnd.microsoft.icon': 'an icon',
}

/**
 * What is wrong with a card image of this content type, in the operator's
 * words, or null when it is fine. `null`/empty means UNKNOWN (the check
 * couldn't run) and is not a problem here: cgos will say so at send.
 */
export function rcsImageTypeProblem(contentType: string | null | undefined): string | null {
  const t = (contentType ?? '').split(';')[0].trim().toLowerCase()
  if (!t || RCS_IMAGE_TYPES.includes(t)) return null
  const need = 'RCS cards need JPEG, PNG or GIF.'
  if (!t.startsWith('image/')) {
    return t === 'text/html'
      ? `The image link opens a web page, not an image. ${need}`
      : `The image link isn't an image (${t}). ${need}`
  }
  const name = IMAGE_TYPE_NAME[t] ?? t.slice('image/'.length).toUpperCase()
  return `This image is ${name}; ${need}`
}

/** `{tag}` or `{{tag}}` anywhere in the text. */
/**
 * Emoji detection matching cgos `rcs_content.has_emoji`: pictographs and other
 * symbols, the presentation selector, the joiner, skin tones, flags and tags.
 */
const EMOJI_RE = /[\p{Extended_Pictographic}\p{So}\u200D\u20E3\uFE0E\uFE0F\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u

export function hasEmoji(text: string | null | undefined): boolean {
  return EMOJI_RE.test(text ?? '')
}

export function hasMergeTag(text: string | null | undefined): boolean {
  return /\{\{\s*[a-z_]+\s*\}\}|\{[a-z_]+\}/.test(text ?? '')
}

/**
 * A reply button's id, derived from its label: "I'm in" → `im_in`. Unique
 * against `taken` by suffix (`yes`, `yes_2`). Never empty.
 */
export function slugButtonId(label: string, taken: Iterable<string> = []): string {
  const used = new Set(taken)
  const base =
    label
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_-]+|[_-]+$/g, '')
      .slice(0, RCS_CARD_LIMITS.id - 3) || 'reply'
  if (!used.has(base)) return base
  for (let n = 2; ; n++) {
    const next = `${base}_${n}`
    if (!used.has(next)) return next
  }
}

export interface RcsCardIssue {
  /** `title` · `body` · `media_url` · `card` · `buttons` · `button:{index}` */
  field: string
  message: string
  /**
   * `shape`: the database refuses to STORE the card (cgos `card_problem`,
   * mirrored by a CHECK on `transmissions.rcs_card`), so a save carrying it
   * fails whole. `send`: storable, refused only at Send (`send_problem`).
   */
  kind: 'shape' | 'send'
}

/** Does a tap on this button await an answer? Absent means yes; only a reply
 *  button can say no. cgos `rcs_content.tap_awaits_reply`. */
export function buttonNeedsReply(b: Pick<RcsCardButton, 'type' | 'needs_reply'>): boolean {
  return b.type === 'reply' && b.needs_reply !== false
}

/**
 * The button with a new type. `needs_reply` belongs to reply buttons, so it
 * goes when the button stops being one (the database refuses it elsewhere).
 */
export function withButtonType(b: RcsCardButton, type: RcsButtonType): RcsCardButton {
  const next: RcsCardButton = { ...b, type }
  if (type !== 'reply') delete next.needs_reply
  return next
}

/** A card that goes out: present and not switched off. */
export function isCardOn(card: RcsCard | null | undefined): card is RcsCard {
  return !!card && card.off !== true
}

/** True when the database would accept this card as stored. */
export function isStorableRcsCard(card: RcsCard | null): boolean {
  return !card || validateRcsCard(card).every((i) => i.kind !== 'shape')
}

export interface RcsCardCheckOptions {
  /**
   * The content type the card image answered with (a HEAD through the link
   * preview), when known. A type cgos refuses is a `send` issue on
   * `media_url`; unknown (`null`/absent) is not checked.
   */
  mediaType?: string | null
  /**
   * The send is "text, then card", so the card's own words become the second
   * message's SMS fallback and have their own ceiling. cgos `send_problem`.
   */
  textFirst?: boolean
}

/**
 * Everything cgos would refuse, in the operator's words. Empty = sendable.
 * Pass the SMS text to also check it for `{{…}}` Twilio can't fill, and the
 * image's content type to check that too.
 */
export function validateRcsCard(
  card: RcsCard,
  smsText?: string,
  opts: RcsCardCheckOptions = {},
): RcsCardIssue[] {
  const issues: RcsCardIssue[] = []
  // cgos: `off` must be a boolean, and a card switched off is kept unchecked.
  const off: unknown = card.off
  if (off !== undefined && off !== null && typeof off !== 'boolean') {
    return [{ kind: 'shape', field: 'card', message: 'off must be true or false.' }]
  }
  if (off === true) return issues
  const title = (card.title ?? '').trim()
  const body = (card.body ?? '').trim()
  const media = (card.media_url ?? '').trim()
  const buttons = card.buttons ?? []

  if (title.length > RCS_CARD_LIMITS.title) {
    issues.push({ kind: 'shape', field: 'title', message: `Title is over ${RCS_CARD_LIMITS.title} characters.` })
  }
  if (body.length > RCS_CARD_LIMITS.body) {
    issues.push({ kind: 'shape', field: 'body', message: `Text is over ${RCS_CARD_LIMITS.body.toLocaleString()} characters.` })
  }
  if (media && !isHttpsUrl(media)) {
    issues.push({ kind: 'shape', field: 'media_url', message: 'The image needs an https link.' })
  } else if (media) {
    const typeProblem = rcsImageTypeProblem(opts.mediaType)
    if (typeProblem) issues.push({ kind: 'send', field: 'media_url', message: typeProblem })
  }
  const filled = [title, body, media].filter(Boolean).length + (buttons.length > 0 ? 1 : 0)
  if (!title && !body) {
    issues.push({ kind: 'shape', field: 'card', message: 'A card needs a title or text.' })
  } else if (filled < 2) {
    issues.push({ kind: 'shape', field: 'card', message: 'A card needs one more thing: an image, text or a button.' })
  }
  if (buttons.length > RCS_CARD_LIMITS.buttons) {
    issues.push({ kind: 'shape', field: 'buttons', message: `At most ${RCS_CARD_LIMITS.buttons} buttons.` })
  }
  if (buttons.filter((b) => b.type === 'url').length > RCS_CARD_LIMITS.urlButtons) {
    issues.push({ kind: 'shape', field: 'buttons', message: `At most ${RCS_CARD_LIMITS.urlButtons} link buttons.` })
  }
  const seen = new Set<string>()
  buttons.forEach((b, i) => {
    const field = `button:${i}`
    const label = (b.title ?? '').trim()
    if (!label) issues.push({ kind: 'shape', field, message: 'Give this button a label.' })
    else if (label.length > RCS_CARD_LIMITS.buttonTitle) {
      issues.push({ kind: 'shape', field, message: `Labels are at most ${RCS_CARD_LIMITS.buttonTitle} characters.` })
    } else if (b.type === 'reply' && REPLY_RESERVED_WORDS.has(label.toUpperCase())) {
      issues.push({
        kind: 'send',
        field,
        message: `"${label}" is a text keyword, so tapping it would act as ${label.toUpperCase()}. Choose another label.`,
      })
    } else if (/[{}]/.test(label)) {
      issues.push({ kind: 'send', field, message: "A button label can't use merge tags." })
    } else if (hasEmoji(label)) {
      // Twilio refuses the whole card: "Button Title text cannot contain emojis"
      // (400, found 2026-09-17). Emoji stay fine in the card's title and text.
      issues.push({ kind: 'send', field, message: 'Twilio doesn\'t allow emoji in button labels. Use words; emoji can go in the card text.' })
    }
    if (!RCS_BUTTON_ID_RE.test(b.id ?? '')) {
      issues.push({ kind: 'shape', field, message: 'Button id must be lowercase letters, numbers, _ or -.' })
    } else if (seen.has(b.id)) {
      issues.push({ kind: 'shape', field, message: 'Two buttons share an id.' })
    }
    seen.add(b.id)
    if (b.type === 'url' && !isHttpsUrl(b.value)) {
      issues.push({ kind: 'shape', field, message: 'A link button needs an https link.' })
    }
    if (b.type === 'call' && !isE164(b.value)) {
      issues.push({ kind: 'shape', field, message: 'A call button needs a number like +16125550123.' })
    }
    const needsReply: unknown = b.needs_reply
    if (needsReply !== undefined && needsReply !== null && typeof needsReply !== 'boolean') {
      issues.push({ kind: 'shape', field, message: '"Needs a reply" must be on or off.' })
    } else if (b.type !== 'reply' && typeof needsReply === 'boolean') {
      issues.push({ kind: 'shape', field, message: 'Only a reply button can say whether it needs a reply.' })
    }
  })
  if (opts.textFirst) {
    // The fallback is the card flattened, so a card comfortably inside its own
    // 1,600 can still put the second message over Twilio's ceiling, which
    // refuses the whole message (21617). cgos refuses it at Send.
    const derived = cardFallbackText({ title, body, buttons }, smsText ?? '')
    if (derived.length > RCS_CARD_LIMITS.body) {
      issues.push({
        kind: 'send',
        field: 'card',
        message: `The text phones without RCS get instead of the card is ${derived.length.toLocaleString()} characters; the limit is ${RCS_CARD_LIMITS.body.toLocaleString()}. Shorten the card.`,
      })
    }
  }
  const known = new Set<string>(RCS_MERGE_TAGS)
  const leftovers: [string, string][] = [
    ['The SMS text', smsText ?? ''],
    ['The card title', title],
    ['The card text', body],
  ]
  for (const [where, text] of leftovers) {
    const rest = text.replace(/\{\{\s*([a-z_]+)\s*\}\}|\{([a-z_]+)\}/g, (m, a, b) =>
      known.has(a ?? b) ? '' : m,
    )
    if (rest.includes('{{') || rest.includes('}}')) {
      issues.push({
        kind: 'send',
        field: 'card',
        message: `${where} contains {{…}}, which Twilio reads as a variable. A card can fill ${RCS_MERGE_TAGS.map((t) => `{${t}}`).join(' and ')}.`,
      })
    }
  }
  return issues
}

// ── The send shape (cgos plan §14/§15) ──────────────────────────────────────

/**
 * How a transmission's SMS leg goes out. Stored as TWO facts, not one — the
 * card already answers "is there a card", and a second column saying it again
 * would drift from it:
 *
 *   text            rcs_card null or `off: true`   (`sms_text_first` ignored)
 *   card            card on                        `sms_text_first` false
 *   text_then_card  card on                        `sms_text_first` TRUE
 *
 * `text_then_card` sends TWO messages to each recipient, a moment apart: the
 * personal line, then the card. Feather, seeing a card on his own phone:
 * "it feels very marketing. It doesn't feel like a person sent that." His
 * words inside a branded object read as a brand; a plain text reads as him.
 */
export type SendShape = 'text' | 'card' | 'text_then_card'

export const SEND_SHAPE_LABEL: Record<SendShape, string> = {
  text: 'Text',
  card: 'Card',
  text_then_card: 'Text, then card',
}

export const SEND_SHAPE_HINT: Record<SendShape, string> = {
  text: 'Your message, with its link. One message.',
  card: 'A card with artwork and buttons, instead of the text.',
  text_then_card: 'Your message first, then the card a moment later. Two messages.',
}

/** How many messages each recipient gets on the SMS leg. */
export function shapeMessageCount(shape: SendShape): number {
  return shape === 'text_then_card' ? 2 : 1
}

export function sendShape(card: RcsCard | null | undefined, textFirst?: boolean | null): SendShape {
  if (!isCardOn(card)) return 'text'
  return textFirst ? 'text_then_card' : 'card'
}

/**
 * What phones WITHOUT RCS receive as the second message of a "text, then card"
 * send: the card flattened — its title, its text, then each link button's URL,
 * unless the SMS text already carries that URL.
 *
 * A card template must carry a `twilio/text` part or a non-RCS phone receives
 * nothing at all. In a card-only send that part is the SMS text, which is
 * right because the card IS the message; here the SMS text has already been
 * read as message one, so reusing it would text the same words twice.
 *
 * MIRROR of cgos `rcs_content.card_fallback_text`. The composer shows this
 * exact string, because it is what half the audience reads and nothing else
 * on screen would say so.
 */
export function cardFallbackText(
  card: Pick<RcsCard, 'title' | 'body' | 'buttons'>,
  smsBody: string,
): string {
  const parts = [(card.title ?? '').trim(), (card.body ?? '').trim()].filter(Boolean)
  const said = smsBody ?? ''
  for (const b of card.buttons ?? []) {
    if (b.type !== 'url') continue
    const url = (b.value ?? '').trim()
    if (url && !said.includes(url) && !parts.includes(url)) parts.push(url)
  }
  return parts.join('\n').trim()
}

/** The `twilio/text` the send builds for this shape. cgos `fallback_body_for`. */
export function fallbackBodyFor(
  card: Pick<RcsCard, 'title' | 'body' | 'buttons'>,
  smsBody: string,
  textFirst: boolean,
): string {
  return textFirst ? cardFallbackText(card, smsBody) : (smsBody ?? '')
}

/**
 * Read a stored card defensively. Anything that isn't a card object is null
 * (no card); unknown fields are dropped; a malformed button is dropped rather
 * than failing the whole card, because the composer is where it gets fixed.
 */
export function parseRcsCard(raw: unknown): RcsCard | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
  const buttons: RcsCardButton[] = Array.isArray(r.buttons)
    ? r.buttons.flatMap((b): RcsCardButton[] => {
        if (!b || typeof b !== 'object') return []
        const x = b as Record<string, unknown>
        const type = x.type
        if (type !== 'reply' && type !== 'url' && type !== 'call') return []
        return [{
          id: str(x.id) ?? '',
          title: str(x.title) ?? '',
          type,
          ...(str(x.value) !== undefined ? { value: str(x.value) } : {}),
          // Kept on reply buttons only: cgos refuses it anywhere else.
          ...(type === 'reply' && typeof x.needs_reply === 'boolean' ? { needs_reply: x.needs_reply } : {}),
        }]
      })
    : []
  const height = r.height === 'SHORT' || r.height === 'MEDIUM' || r.height === 'TALL' ? r.height : undefined
  const orientation =
    r.orientation === 'VERTICAL' || r.orientation === 'HORIZONTAL' ? r.orientation : undefined
  return {
    ...(typeof r.auto === 'boolean' ? { auto: r.auto } : {}),
    ...(typeof r.off === 'boolean' ? { off: r.off } : {}),
    ...(str(r.media_url) !== undefined ? { media_url: str(r.media_url) } : {}),
    ...(str(r.title) !== undefined ? { title: str(r.title) } : {}),
    ...(str(r.body) !== undefined ? { body: str(r.body) } : {}),
    ...(orientation ? { orientation } : {}),
    ...(height ? { height } : {}),
    buttons,
  }
}
