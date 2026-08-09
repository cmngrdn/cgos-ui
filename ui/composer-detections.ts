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
  buildSmsPreviewTokens,
  detectLinks,
  findEncodingCulprits,
  findMalformedLinks,
  smsSegmentInfo,
  stripToGsm,
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
 * Which detector runs in which mode. `social` is empty until per-platform
 * limits land — an empty detector renders no HUD at all, which is correct:
 * a readout with nothing to report is chrome.
 */
export const CHANNEL_DETECTORS: Record<ComposerChannel, ComposerDetector | null> = {
  sms: smsDetector,
  rcs: smsDetector, // same transport economics until RCS billing says otherwise
  email: emailDetector,
  social: null,
}

export { buildSmsPreviewTokens, smsSegmentInfo }
