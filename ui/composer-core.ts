/**
 * Composer — the parts with no React in them.
 *
 * Split out so the paste sanitiser can be asserted directly. It is the piece
 * most worth testing (it is the security boundary for pasted markup) and the
 * piece least worth rendering to test, and importing `Composer.tsx` drags in
 * React just to reach a pure string function.
 *
 * See Composer.tsx for the design rationale.
 */

/** A formatting affordance. Absent from `capabilities` means the button is not
 *  rendered — not rendered-and-disabled, which would advertise a thing the
 *  channel cannot do. */
export type ComposerCapability =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'bulletList'
  | 'orderedList'
  | 'link'

export type ComposerChannel = 'email' | 'sms' | 'rcs' | 'social'

/**
 * What each channel can actually carry. A statement about the transport, not
 * about taste.
 *
 * `sms` is empty because SMS has no markup layer: GSM-7/UCS-2 is plain text, so
 * "bold" could only be emitted as Unicode math-alphanumerics (𝗯𝗼𝗹𝗱), which are
 * separate codepoints that force the whole body to UCS-2 and halve the
 * per-segment budget — measured at 1 segment → 2 for the same 40-character
 * sentence.
 *
 * `rcs` is populated and currently unused. RCS does carry formatting and the
 * campaigns are already registered, so when that path goes live an SMS surface
 * changes a channel string rather than a component.
 *
 * `social` is empty because each platform strips or mangles differently, and a
 * button that works on one and silently drops on another is worse than none.
 */
export const CHANNEL_CAPABILITIES: Record<ComposerChannel, ComposerCapability[]> = {
  email: ['bold', 'italic', 'underline', 'bulletList', 'orderedList', 'link'],
  sms: [],
  rcs: ['bold', 'italic', 'underline'],
  social: [],
}

/** Tags that survive a rich paste. Everything else is unwrapped to its text, so
 *  content is never lost — only its styling. Deliberately no `span`, `font`,
 *  `div` or `style`: that is how a paste out of Gmail drags 14px Arial and a
 *  hardcoded blue into a workspace-themed email. */
const PASTE_ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'A', 'UL', 'OL', 'LI', 'BR', 'P',
])

/**
 * Tags removed WITH their contents, rather than unwrapped to text.
 *
 * Unwrapping is right for everything else — a `<div>` or `<span>` is chrome
 * around prose the operator wants to keep. It is wrong for these, because their
 * text content is code, not prose: unwrapping `<script>alert(1)</script>` yields
 * the literal characters `alert(1)` in the message body. Not executable, and
 * still wrong — a paste from a page carrying an analytics snippet would silently
 * append it as visible text to an email going to the whole audience.
 *
 * Caught by testing the sanitiser rather than by reading it.
 */
const PASTE_DROP_ENTIRELY = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'OBJECT', 'EMBED', 'HEAD',
])

/** Only `http(s)` and `mailto` survive. This is the security boundary: a pasted
 *  anchor is attacker-controlled markup, and `javascript:` in an href is the
 *  cheapest way to turn a paste into script execution. */
export function safeHref(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : null
}

/**
 * Reduce a pasted fragment to PASTE_ALLOWED_TAGS, keeping the text of anything
 * removed and every attribute of nothing.
 *
 * Parsed into a DETACHED document (`createHTMLDocument`), which is what stops
 * an `<img src>` or `<script>` in the payload from firing during sanitisation —
 * assigning the same string to a live element's innerHTML would load and
 * execute before a single tag was inspected.
 */
export function sanitizePastedHtml(html: string, doc?: Document): string {
  const target =
    doc ??
    (typeof document !== 'undefined'
      ? document.implementation.createHTMLDocument('')
      : null)
  if (!target) return ''
  target.body.innerHTML = html

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) continue // text
      if (child.nodeType !== 1) {
        child.parentNode?.removeChild(child) // comments, CDATA
        continue
      }
      const el = child as HTMLElement

      // Checked BEFORE recursing: there is nothing inside a <script> worth
      // walking, and unwrapping it would surface its source as text.
      if (PASTE_DROP_ENTIRELY.has(el.tagName)) {
        el.parentNode?.removeChild(el)
        continue
      }

      walk(el)

      if (!PASTE_ALLOWED_TAGS.has(el.tagName)) {
        el.replaceWith(...Array.from(el.childNodes))
        continue
      }
      const href = el.tagName === 'A' ? safeHref(el.getAttribute('href')) : null
      for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name)
      if (el.tagName === 'A') {
        // An anchor whose href didn't survive becomes its own text rather than
        // a dead link the operator can't tell is dead.
        if (href) {
          el.setAttribute('href', href)
          el.setAttribute('rel', 'noopener noreferrer')
        } else {
          el.replaceWith(...Array.from(el.childNodes))
        }
      }
    }
  }
  walk(target.body)
  return target.body.innerHTML
}

/** True when the field holds nothing a recipient would see. Uses innerText, not
 *  innerHTML: iOS Safari leaves a stray `<br>` in a cleared contentEditable, so
 *  an innerHTML check reports content that isn't there and enables Send on an
 *  empty message. */
export function composerIsEmpty(el: { innerText?: string } | null): boolean {
  if (!el) return true
  return (el.innerText ?? '').trim().length === 0
}

/**
 * A channel that cannot RENDER formatting must not RETAIN it on paste.
 *
 * Enforced centrally rather than per callsite because it is the same rule
 * everywhere and a surface passing the wrong prop should be unable to produce
 * the wrong result. Without it, an SMS composer asked for `rich` would show the
 * operator bold text that the send path strips — a preview that lies — or worse
 * let the markup through as literal characters and buy a second segment.
 */
export function effectivePasteMode(
  caps: ComposerCapability[],
  requested: 'plain' | 'rich',
): 'plain' | 'rich' {
  return caps.length === 0 ? 'plain' : requested
}

/**
 * Whether this surface's `value` is plain text rather than HTML.
 *
 * Same predicate as above, named separately because it governs a different and
 * more consequential thing: what the engine HANDS BACK to the surface. A
 * contentEditable emits `<div>`/`<br>` when Enter is pressed no matter what its
 * toolbar offers, so a capability-less channel that returned `innerHTML` would
 * write literal markup into an SMS body — and SMS has no HTML layer to strip
 * it. The recipient reads the tags, and the invisible characters can buy a
 * second segment.
 *
 * Keyed on capabilities, NOT on the paste mode: the inquiry reply composer is
 * `paste="plain"` (a client's fonts shouldn't follow their email into your
 * thread) while being genuinely rich, and must keep emitting markup.
 */
export function isPlainTextSurface(caps: ComposerCapability[]): boolean {
  return caps.length === 0
}
