import { ArrowBendUpLeft } from '@phosphor-icons/react'

/**
 * THE MARKS — the only four marks a row carries (cgos `docs/hq-system.md`
 * K1–K5). Each says one fact and never competes with the others:
 *
 *   Dot         K1 — something arrived you haven't opened. One frost colour
 *               for every channel, left of the face; clears on open.
 *   TurnChip    K2 — you owe them a word: a reply arrow and the wait as a
 *               number ("3d"), sol, on or off — never an age ramp. Fed by
 *               cgos `needs_you`; unread is not your turn.
 *   StageMark   K3 — where an inquiry stands: a word and a pale dot, off the
 *               status hues. `dim` for a past inquiry's last stage; `more`
 *               for "+1 open".
 *   BookingDot  K4 — a booking's own status: held aurora, no-show ember,
 *               cancelled a hollow muted ring, unconfirmed a hollow dim ring.
 *
 * Resting state in `ui/Mark.css`, keyed off `data-cg-mark`. Every mark is a
 * `role="img"` with its words as the label and the tooltip.
 */

/** A wait as the chip says it: one unit, the largest — 12m · 5h · 3d. */
export function fmtWaitShort(minutes: number): string {
  const m = Math.max(0, Math.floor(minutes))
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  return `${Math.floor(m / 1440)}d`
}

export function Dot({ label = 'Unread', className }: { label?: string; className?: string }) {
  return <span data-cg-mark="dot" role="img" aria-label={label} title={label} className={className} />
}

export function TurnChip({
  minutes,
  why,
  className,
}: {
  /** how long they have waited on you */
  minutes: number
  /** what is owed, when it is not a reply ("nothing paid") */
  why?: string
  className?: string
}) {
  const n = fmtWaitShort(minutes)
  const words = `Your turn — waiting ${n}${why ? ` · ${why}` : ''}`
  return (
    <span data-cg-mark="turn" role="img" aria-label={words} title={words} className={className}>
      <ArrowBendUpLeft size={10} weight="bold" aria-hidden />
      <span data-cg-mark-n="">{n}</span>
    </span>
  )
}

export type Stage = 'new' | 'talking' | 'quoted' | 'booked' | 'done' | 'closed'

const STAGE_WORD: Record<Stage, string> = {
  new: 'New',
  talking: 'Talking',
  quoted: 'Quoted',
  booked: 'Booked',
  done: 'Done',
  closed: 'Closed',
}

export function StageMark({
  stage,
  dim,
  more,
  word,
  className,
}: {
  stage: Stage
  /** a past inquiry's last stage (no open one) — "Done · Aug" reads quieter */
  dim?: boolean
  /** other open inquiries beyond this one — "+1 open" */
  more?: number
  /** override the word (a suffix like "Done · Aug") */
  word?: string
  className?: string
}) {
  const text = word ?? STAGE_WORD[stage]
  const label = `${text}${more ? ` · +${more} open` : ''}`
  return (
    <span data-cg-mark="stage" data-stage={stage} data-dim={dim || undefined} title={label} aria-label={label} role="img" className={className}>
      <i aria-hidden />
      <span>{text}</span>
      {more ? <span data-cg-mark-more="">+{more} open</span> : null}
    </span>
  )
}

export type BookingMark = 'held' | 'unconfirmed' | 'no_show' | 'cancelled'

export function BookingDot({ mark, word, className }: { mark: BookingMark; word: string; className?: string }) {
  return <span data-cg-mark="booking" data-booking={mark} role="img" aria-label={word} title={word} className={className} />
}
