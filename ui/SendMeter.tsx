'use client'

import { useMemo } from 'react'

import {
  bodyLimitInfo,
  rcsSegmentInfo,
  smsSegmentInfo,
  TWILIO_BODY_LIMIT,
} from '../lib/sms'

/**
 * SendMeter — what this message costs, in two lines that never move.
 *
 * REPLACES THREE READOUTS THAT SAID OVERLAPPING THINGS IN DIFFERENT PLACES:
 * the SMS thread's `{n} chars · {n} segments · UCS-2 (emoji/special chars cut
 * the limit to 70/segment)` prose line, the transmission HUD's encoding badge +
 * count + segment meter, and the HUD's separate "Two rails, one send" block.
 * Feather, 2026-09-19: *"wonder if these two things could be more efficiently
 * combined into a tighter visual feedback tool? Maybe two small tight combined
 * colored layers with character and segment count for each?"* — which is this.
 *
 * ── The two design rules, both of which were live complaints ──────────────
 *
 * **1. IT RESERVES ITS SPACE.** The old readouts rendered conditionally: the
 * thread's appeared at the first keystroke, the HUD's UCS-2 warning appeared
 * the moment an emoji landed. So typing an emoji moved the composer, the send
 * button and the conversation above it — *"we have to make sure that it doesn't
 * change the UI every time it pops up and then goes away. Needs to have its own
 * area maybe?"*. The meter is always present at its full height once mounted;
 * at zero characters it reads `0 chars` in muted tone. A readout that appears
 * when there is bad news is a readout that shoves the page every time the news
 * changes.
 *
 * **2. TWO RAILS ARE TWO LINES, NOT TWO PARAGRAPHS.** Which rail a given
 * recipient gets is decided by Twilio per recipient at send time, so the honest
 * readout is both — and the Bloomwake send measured the split at 75% RCS / 25%
 * SMS, i.e. neither line is the footnote. Each rail is one row: a tone chip,
 * one fact, and a bar. Stacked, they are the same height the single prose line
 * used to be.
 *
 * ── Why the two rails count differently, which is the fact worth showing ───
 *
 * An emoji costs NOTHING on RCS (UTF-8) and halves the SMS budget (UCS-2,
 * 160→70 per segment). One body, two prices. `rcsSegmentInfo` and
 * `smsSegmentInfo` already know this; the meter's job is to put the two numbers
 * where one glance compares them, so "this emoji doubled my SMS cost and did
 * nothing to my RCS cost" is legible without reading a sentence about encoding.
 *
 * ── What it deliberately does NOT do ──────────────────────────────────────
 *
 * It does not explain, remediate, or gate. WHICH characters force Unicode, the
 * "strip to plain text" fix, link health and the over-the-limit exits stay with
 * the surface (`SmsComposerHud`) — they are prose and buttons, they appear only
 * when they apply, and folding them in here would give the meter back the
 * variable height rule 1 exists to remove. The meter is the gauge; the HUD is
 * the mechanic. The ONE exception is the ceiling: at over 1,600 units the
 * message cannot be created at all, and a gauge that prices an impossible send
 * is worse than no gauge, so the SMS rail says `over the limit` in danger tone.
 */

export interface SendMeterProps {
  /** The PLAIN-TEXT body as it will send. Never HTML — see `detectionText`. */
  body: string
  /**
   * Does this workspace have an RCS agent in front of its number? False for
   * every workspace without one, which is the correct default: showing an RCS
   * rail to a workspace that has none is fiction, and the point of this readout
   * is what actually happens to the message.
   */
  rcs?: boolean
  /** Rendered at the end of the row — the emoji/attach/replies cluster, a cost
   *  line, whatever the surface owns. */
  trailing?: React.ReactNode
  /** `sm` (default) for a thread's compose row, `md` for a builder panel. */
  size?: 'sm' | 'md'
  className?: string
}

interface Rail {
  key: 'rcs' | 'sms'
  label: string
  fact: string
  /** 0–1. The bar's fill. */
  fraction: number
  tone: 'muted' | 'ok' | 'warn' | 'danger'
  /** Boundary positions as 0–1 fractions — the SMS rail's segment splits. */
  ticks: number[]
  title: string
}

export function SendMeter({
  body,
  rcs = false,
  trailing,
  size = 'sm',
  className,
}: SendMeterProps) {
  const rails = useMemo<Rail[]>(() => {
    const sms = smsSegmentInfo(body)
    const limit = bodyLimitInfo(body)
    const empty = body.length === 0

    // THE BUDGET IS THE CURRENT SEGMENT COUNT'S CAPACITY, not a fixed 160. A
    // three-segment message showing a bar pinned at 100% says nothing; against
    // its own 3×153 budget the bar says how close the fourth segment is.
    const budget = sms.perSegment * Math.max(1, sms.segments)
    const smsRail: Rail = {
      key: 'sms',
      label: 'SMS',
      fact: limit.over
        ? `${limit.length.toLocaleString()} over the ${TWILIO_BODY_LIMIT.toLocaleString()} limit`
        : empty
          ? '0 chars'
          : `${sms.effectiveLength.toLocaleString()} chars · ${sms.segments} segment${sms.segments === 1 ? '' : 's'} · ${sms.encoding}`,
      fraction: budget > 0 ? Math.min(1, sms.effectiveLength / budget) : 0,
      tone: limit.over
        ? 'danger'
        : empty
          ? 'muted'
          : sms.encoding === 'UCS-2' || sms.segments > 1
            ? 'warn'
            : 'ok',
      ticks:
        sms.segments > 1
          ? Array.from({ length: sms.segments - 1 }, (_, i) => (i + 1) / sms.segments)
          : [],
      title:
        sms.encoding === 'UCS-2'
          ? `UCS-2: an emoji or a curly quote cuts the budget from 160 to ${sms.perSegment} per segment`
          : `GSM-7: ${sms.perSegment} characters per segment`,
    }
    if (!rcs) return [smsRail]

    const r = rcsSegmentInfo(body)
    const rcsRail: Rail = {
      key: 'rcs',
      label: 'RCS',
      // ONE MESSAGE, whatever it costs. RCS delivers unsegmented, so the
      // recipient-facing fact and the billing fact differ and both are true.
      fact: empty
        ? '0 chars'
        : `${r.effectiveLength.toLocaleString()} chars · one message${r.billedSegments > 1 ? ` · billed ${r.billedSegments}` : ''}`,
      fraction: Math.min(1, r.effectiveLength / TWILIO_BODY_LIMIT),
      tone: limit.over ? 'danger' : empty ? 'muted' : 'ok',
      ticks: [],
      title:
        'RCS is UTF-8 — an emoji costs one character here and halves the SMS budget below',
    }
    return [rcsRail, smsRail]
  }, [body, rcs])

  return (
    <div
      className={`cg-send-meter${className ? ` ${className}` : ''}`}
      data-size={size}
      data-rails={rails.length}
      role="status"
      aria-live="polite"
    >
      <div className="cg-send-meter-rails">
        {rails.map((r) => (
          <div key={r.key} className="cg-send-meter-rail" data-tone={r.tone} title={r.title}>
            <span className="cg-send-meter-tag">{r.label}</span>
            <span className="cg-send-meter-fact">{r.fact}</span>
            <span className="cg-send-meter-bar" aria-hidden>
              <span
                className="cg-send-meter-fill"
                style={{ width: `${Math.round(r.fraction * 100)}%` }}
              />
              {r.ticks.map((t, i) => (
                <span
                  key={i}
                  className="cg-send-meter-tick"
                  style={{ left: `${Math.round(t * 100)}%` }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
      {trailing && <div className="cg-send-meter-trailing">{trailing}</div>}
    </div>
  )
}
