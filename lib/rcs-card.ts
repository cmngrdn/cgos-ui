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
 * Mirrors cgos `rcs_content.card_problem` (shape) and `send_problem` (what
 * only matters at send: keyword titles, merge tags).
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
}

export interface RcsCard {
  auto?: boolean
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

/** `{tag}` or `{{tag}}` anywhere in the text. */
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

/** True when the database would accept this card as stored. */
export function isStorableRcsCard(card: RcsCard | null): boolean {
  return !card || validateRcsCard(card).every((i) => i.kind !== 'shape')
}

/**
 * Everything cgos would refuse, in the operator's words. Empty = sendable.
 * Pass the SMS text to also check it for `{{…}}` Twilio can't fill.
 */
export function validateRcsCard(card: RcsCard, smsText?: string): RcsCardIssue[] {
  const issues: RcsCardIssue[] = []
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
  })
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
        }]
      })
    : []
  const height = r.height === 'SHORT' || r.height === 'MEDIUM' || r.height === 'TALL' ? r.height : undefined
  const orientation =
    r.orientation === 'VERTICAL' || r.orientation === 'HORIZONTAL' ? r.orientation : undefined
  return {
    ...(typeof r.auto === 'boolean' ? { auto: r.auto } : {}),
    ...(str(r.media_url) !== undefined ? { media_url: str(r.media_url) } : {}),
    ...(str(r.title) !== undefined ? { title: str(r.title) } : {}),
    ...(str(r.body) !== undefined ? { body: str(r.body) } : {}),
    ...(orientation ? { orientation } : {}),
    ...(height ? { height } : {}),
    buttons,
  }
}
