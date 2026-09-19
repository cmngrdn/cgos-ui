'use client'

import { type ReactNode } from 'react'

/**
 * StatChip — a count that is also the filter that produces it.
 *
 * `StatTile`'s row-height sibling. Reach for `StatTile` when the number is the
 * content of the surface (the Audience health strip — a row of tall tiles you
 * read first). Reach for `StatChip` when the number is CHROME above a list:
 * "3 blocking payroll", "20 waiting on a reply", "12 unread". A tile there
 * takes a band of vertical space from the rows it describes, which is Feather's
 * note about Airtable's version — *"although theirs are huge"*.
 *
 * ONE GUARANTEE, AND IT IS THE POINT: the number on a chip is by construction
 * the number of rows clicking it produces. That holds only if the count and the
 * filter come from ONE predicate, so a consumer defines `{label, tone, match}`
 * once and derives both — never a count loop beside a separate filter branch,
 * which is two things to keep in step and a chip that eventually lies.
 *
 * WHY IT IS AN ATOM. Two copies of this already existed, both called
 * `SummaryChip`, both local: `CrewRosterPage` (clickable, with an active state)
 * and `HrBoardPage` (not clickable). The SMS inbox grew a third shape for the
 * same job — a prose sentence, not a control — and Feather's read was that the
 * two should be one thing: *"we just really need to get smarter about all those
 * things how they work together… whatever we end up doing we need to
 * standardize it across any module's tabs so it's a consistent UI decision."*
 *
 * THE PRESSED STATE IS NOT OPTIONAL AND WAS THE ACTUAL BUG. The crew chips
 * filtered when clicked and looked identical afterwards, so *"nothing indicates
 * whether it's clicked the way the blast only button does"* — a control whose
 * effect you can only confirm by counting rows. `aria-pressed` plus a real
 * accent ring, at the same 28px height as `ControlChip`, so a chip row and a
 * filter row sit on one line without either setting the other's baseline.
 *
 * WHERE IT GOES: BELOW the filter tools, never above them. Feather again:
 * *"they're on a row above the normal filter tools; which I don't think makes
 * sense. Would probably be below."* The reading is right — the chips are a
 * shortcut INTO the filter state that the strip above them shows, so they read
 * as derived from it rather than as a second, senior control.
 */

export type StatChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export interface StatChipProps {
  /** Pre-formatted — the atom does no number formatting. */
  value: ReactNode
  label: string
  /** Colours the VALUE only; the label stays secondary so a row of chips
   *  scans as one thing with several readings, not five coloured buttons. */
  tone?: StatChipTone
  /** Omit and the chip is a readout rather than a control. */
  onClick?: () => void
  /** Filter-is-on. Renders the accent ring and sets `aria-pressed`. */
  active?: boolean
  disabled?: boolean
  /** Overrides the generated one ("Show N blocking payroll"). */
  title?: string
  className?: string
}

export function StatChip({
  value,
  label,
  tone = 'neutral',
  onClick,
  active = false,
  disabled,
  title,
  className,
}: StatChipProps) {
  const cls = `cg-stat-chip${className ? ` ${className}` : ''}`
  const hint =
    title ??
    (onClick
      ? active
        ? `Showing ${label.toLowerCase()} — click to clear`
        : `Show ${label.toLowerCase()}`
      : undefined)

  const body = (
    <>
      <span className="cg-stat-chip-value">{value}</span>
      <span className="cg-stat-chip-label">{label}</span>
    </>
  )

  // A READOUT IS NOT A BUTTON. Rendering a disabled `<button>` for the
  // non-interactive case would put it in the tab order and promise a click
  // that never comes.
  if (!onClick) {
    return (
      <span data-cg-stat-chip="" data-tone={tone} className={cls} title={hint}>
        {body}
      </span>
    )
  }

  return (
    <button
      type="button"
      data-cg-stat-chip=""
      data-tone={tone}
      data-active={active ? '' : undefined}
      className={cls}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={hint}
    >
      {body}
    </button>
  )
}

/**
 * StatChipRow — the strip they live in.
 *
 * Its own component because the wrapping rule is part of the pattern: chips
 * wrap onto a second line rather than scrolling sideways, since a count you
 * cannot see is a count that is not doing its job. Consumers kept re-declaring
 * `display:flex; flex-wrap:wrap; gap:8px` and drifting on the gap.
 */
export function StatChipRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`cg-stat-chip-row${className ? ` ${className}` : ''}`}>{children}</div>
  )
}
