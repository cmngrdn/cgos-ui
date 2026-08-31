/**
 * Composer detections — what the engine notices, per mode.
 *
 * THE IDEA. One engine, but the terrain differs. An SMS body has a segment
 * budget and a Unicode cliff; an email body has neither and cares about whether
 * its links resolve. Rather than each surface bolting on its own readout — which
 * is how the transmission composer ended up knowing what a segment costs while
 * the SMS thread composer, sending the same kind of message, knew nothing — the
 * engine holds the concept and the CHANNEL supplies the detections.
 *
 * So a detection is a small uniform record, and every mode produces the same
 * shape. The HUD renders any list of them identically, which is what makes the
 * readout consistent everywhere without every surface reimplementing it.
 *
 * THE CONTRACT IS DELIBERATELY NARROW. A detection states a fact, optionally
 * explains it, and optionally offers ONE fix that rewrites the body. It cannot
 * block a send. That is the HUD-readout rule from cgos docs/dispatch-hud-plan.md:
 * live, shows the sent-state truth, explains the why inline, offers one-tap
 * remediation, and never gates. An operator who wants to spend two segments on
 * an emoji is allowed to; they just shouldn't do it by accident.
 */

import {
  bodyLimitInfo,
  detectLinks,
  findEncodingCulprits,
  findMalformedLinks,
  rcsSegmentInfo,
  smsSegmentInfo,
  stripToGsm,
  trimToBodyLimit,
  TWILIO_BODY_LIMIT,
} from '../lib/sms'
import type { ComposerChannel } from './composer-core'

export type DetectionTone = 'neutral' | 'success' | 'warning' | 'danger'

export interface ComposerDetection {
  /** Stable across recomputes so React keys and tests can hold onto it. */
  id: string
  tone: DetectionTone
  /** The glanceable fact: "2 segments · UCS-2". */
  label: string
  /** Why, in one line: "3 emoji force Unicode". */
  detail?: string
  /**
   * One-tap remediation. `apply` takes the current body and returns the fixed
   * one — it never sends, saves, or touches anything else, so a surface can
   * wire it straight to its setState.
   */
  fix?: { label: string; apply: (body: string) => string }
}

export type ComposerDetector = (body: string) => ComposerDetection[]

/**
 * SMS: the segment cliff, and what pushed you over it.
 *
 * The encoding detection is the one that earns its place. A single emoji — or
 * an autocorrected curly quote, which is the cruel one — silently flips the
 * whole body from GSM-7 (160 chars/segment) to UCS-2 (70), roughly doubling
 * cost. Nothing on screen said so before this readout existed, and "strip to
 * plain text" is offered ONLY when it actually lowers the count, because an
 * offer that changes nothing trains people to ignore offers.
 */
export const smsDetector: ComposerDetector = (body) => {
  if (!body.trim()) return []
  const out: ComposerDetection[] = []

  // FIRST, because it is the only one that means "this will not send at all".
  // A segment count above a body that cannot leave is the readout that failed
  // on 2026-08-31: accurate, prominent, and describing a message with no future.
  const ceiling = ceilingDetection(body)
  if (ceiling) out.push(ceiling)

  const info = smsSegmentInfo(body)
  const isUcs2 = info.encoding === 'UCS-2'
  const segLabel = `${info.segments} segment${info.segments === 1 ? '' : 's'} · ${info.encoding}`

  if (isUcs2) {
    const culprits = findEncodingCulprits(body)
    const stripped = stripToGsm(body)
    const strippedInfo = smsSegmentInfo(stripped)
    const helps =
      stripped !== body &&
      (strippedInfo.encoding === 'GSM-7' || strippedInfo.segments < info.segments)

    out.push({
      id: 'sms-encoding',
      tone: 'warning',
      label: segLabel,
      detail: culprits.length
        ? `${culprits.map((c) => `${c.count} ${c.label}`).join(', ')} — forces Unicode, ${info.perSegment} chars per segment instead of 160`
        : undefined,
      fix: helps
        ? {
            label: `Strip to plain text (${strippedInfo.segments} segment${strippedInfo.segments === 1 ? '' : 's'})`,
            apply: stripToGsm,
          }
        : undefined,
    })
  } else {
    out.push({
      id: 'sms-encoding',
      tone: info.segments > 1 ? 'warning' : 'success',
      label: segLabel,
    })
  }

  const links = detectLinks(body)
  const malformed = findMalformedLinks(body)
  if (links.length || malformed.length) {
    out.push({
      id: 'sms-links',
      tone: malformed.length ? 'danger' : 'neutral',
      label: [
        links.length ? `${links.length} link${links.length === 1 ? '' : 's'} tracked` : '',
        malformed.length ? `${malformed.length} malformed` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      detail: malformed.length ? malformed.join(', ') : undefined,
    })
  }

  return out
}

/**
 * Email: no segment budget, so the only thing worth flagging is a link the
 * recipient will click and find broken. Reuses the SMS link detector on
 * purpose — the same regex the backend wraps with, so what is flagged is what
 * gets rewritten.
 */
export const emailDetector: ComposerDetector = (body) => {
  if (!body.trim()) return []
  const malformed = findMalformedLinks(body)
  if (!malformed.length) return []
  return [
    {
      id: 'email-links',
      tone: 'danger',
      label: `${malformed.length} malformed link${malformed.length === 1 ? '' : 's'}`,
      detail: malformed.join(', '),
    },
  ]
}

/**
 * The ceiling — the ONE detection a surface is expected to gate on.
 *
 * Everything else here is a cost the operator may knowingly accept: two
 * segments for an emoji is a choice. This is not a choice. Over 1,600 the
 * Twilio API 4xxs (error 21617), no Message is created, and the send fails
 * entirely — so the detection exists to explain a Send button that is already
 * disabled, not to warn about one that still works.
 *
 * It stays a DETECTION rather than becoming a blocking mechanism because the
 * contract at the top of this file is that detections cannot block, and that
 * contract is worth more than the convenience of breaking it once. The gate
 * belongs at the send call site; this is how the gate explains itself.
 *
 * Its `fix` is TRIM, never SPLIT. A fix's signature is `(body) => body` — one
 * string in, one out — and splitting produces many. That is not a limitation
 * to work around: a fix rewrites what the operator is holding, while a split
 * creates new sends they have not agreed to yet. Split belongs to a surface
 * that can ask.
 */
function ceilingDetection(body: string): ComposerDetection | null {
  const info = bodyLimitInfo(body)
  if (!info.over) return null
  return {
    id: 'body-limit',
    tone: 'danger',
    label: `${info.length} characters · ${info.excess} over the limit`,
    detail:
      `Twilio rejects any message body over ${TWILIO_BODY_LIMIT} characters, on SMS and RCS alike ` +
      `— this cannot send as one message.`,
    fix: {
      label: `Trim to ${TWILIO_BODY_LIMIT}`,
      apply: (b: string) => trimToBodyLimit(b),
    },
  }
}

/**
 * RCS: one message, no Unicode cliff, and the same US bill.
 *
 * WAS `smsDetector`, WHICH LIED. `CHANNEL_DETECTORS` mapped `rcs` straight at
 * the SMS detector under the note "same transport economics until RCS billing
 * says otherwise". Billing is the half that IS the same — the US carriers
 * charge per 160-character segment on both rails. Encoding is the half that is
 * not, and borrowing the SMS detector made the composer assert two false
 * things about RCS: that an emoji forces a 70-character-per-segment Unicode
 * mode, and that stripping emoji would save money. RCS is UTF-8. It would have
 * offered to destroy content the rail carries perfectly well, to buy nothing.
 *
 * So what it reports is what actually differs: the message arrives whole.
 */
export const rcsDetector: ComposerDetector = (body) => {
  if (!body.trim()) return []
  const out: ComposerDetection[] = []

  const ceiling = ceilingDetection(body)
  if (ceiling) out.push(ceiling)

  const info = rcsSegmentInfo(body)
  out.push({
    id: 'rcs-length',
    tone: ceiling ? 'neutral' : 'success',
    label: `${info.effectiveLength} characters · one message`,
    detail:
      info.billedSegments > 1
        ? `RCS delivers this unsegmented, but US carriers still bill ${info.billedSegments} segments.`
        : undefined,
  })

  const links = detectLinks(body)
  const malformed = findMalformedLinks(body)
  if (links.length || malformed.length) {
    out.push({
      id: 'rcs-links',
      tone: malformed.length ? 'danger' : 'neutral',
      label: [
        links.length ? `${links.length} link${links.length === 1 ? '' : 's'} tracked` : '',
        malformed.length ? `${malformed.length} malformed` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      detail: malformed.length ? malformed.join(', ') : undefined,
    })
  }

  return out
}

/**
 * Which detector runs in which mode. `social` is empty until per-platform
 * limits land — an empty detector renders no HUD at all, which is correct:
 * a readout with nothing to report is chrome.
 */
export const CHANNEL_DETECTORS: Record<ComposerChannel, ComposerDetector | null> = {
  sms: smsDetector,
  rcs: rcsDetector,
  email: emailDetector,
  social: null,
}

export { smsSegmentInfo }
