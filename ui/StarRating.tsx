import { type CSSProperties } from 'react'
import './StarRating.css'

/**
 * `<StarRating>` — ONE rating on a short ordinal scale, as stars.
 *
 * ## Why an atom
 *
 * The crew application asks four skills as a five-star field and has for years;
 * the employee inspector renders the same four. They were two different
 * controls for one question — the form drew stars, the inspector drew bars —
 * so the same answer looked like two different kinds of fact depending on which
 * screen you were on. Feather, 2026-09-19: *"These should also be stars. Not
 * bars, just like it is in the AHLC application form. Wherever these show up
 * across the system it should be the same star glyph / atom."*
 *
 * ## It is ONE rating, not a set of them
 *
 * The four-discipline grid is a crew concern — which disciplines exist, what
 * order they read in, what the group is called — and none of that belongs to a
 * design system. So this atom takes one value and the consumer lays out as many
 * as it has. That split is what lets a future "how would you rate this venue"
 * use it without inheriting stagehand vocabulary.
 *
 * ## `undefined` IS NOT `0`, and the control has to preserve that
 *
 * A rating nobody was asked renders EMPTY. Clicking the star you are already on
 * clears back to unset, which is the only route back to "never asked" once
 * something has been set — and it means a mis-click is undoable without a
 * second control.
 *
 * This is load-bearing rather than fussy: in crew's case the value is the
 * person's own claim about themselves (`employee_profiles.skill_ratings`, whose
 * migration says an absent key means never asked, NOT a zero). Rendering unset
 * as zero stars would turn a question nobody put to them into a self-assessment
 * of none. The same distinction is why `onChange` hands back `undefined` rather
 * than `0` — a consumer writing to a jsonb map DELETES the key.
 *
 * ## No value readout
 *
 * Four stars lit reads as four. The count was printed beside the old control
 * ("four out of five", "Not asked") and Feather's note is that it is redundant
 * and costs a column. A consumer that genuinely needs a caption renders one;
 * the atom does not assume it.
 *
 * ## Keyboard + touch
 *
 * A real radiogroup: ONE tab stop for the whole row, arrows move and commit,
 * Home/End jump to the ends, Backspace/Delete clears. Roving tabindex, so
 * tabbing past a four-skill block does not walk through twenty stops.
 *
 * On a coarse pointer each star gets a 44px-tall centred hit area while the
 * glyph keeps its size — the same pseudo-element technique `IconButton` and
 * `ChipToggle` use, and for the same reason: a 16px star is a quarter of what a
 * finger needs, and these sit in rows too tight to grow.
 */

export interface StarRatingProps {
  /** `undefined` means NEVER ASKED and renders empty. Never pass `0` for it. */
  value: number | undefined
  /** Omitted when read-only. Receives `undefined` when the rating is cleared. */
  onChange?: (next: number | undefined) => void
  /** Scale length. Five everywhere so far; a prop so it is not a magic number. */
  max?: number
  readOnly?: boolean
  /**
   * What is being rated — "Audio", "Lighting". REQUIRED, and it is not decor:
   * a bare row of stars is unreadable to a screen reader, and four of them in a
   * column are indistinguishable from each other.
   */
  label: string
  /** `sm` (14px) for dense rows · `md` (18px, default) · `lg` (24px) for forms. */
  size?: 'sm' | 'md' | 'lg'
  style?: CSSProperties
  className?: string
}

const PX: Record<NonNullable<StarRatingProps['size']>, number> = {
  sm: 14,
  md: 18,
  lg: 24,
}

/** One path, used filled and hollow, so the two states cannot drift in shape. */
function Star({ px }: { px: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9L12 2.6z" />
    </svg>
  )
}

export function StarRating({
  value,
  onChange,
  max = 5,
  readOnly = false,
  label,
  size = 'md',
  style,
  className,
}: StarRatingProps) {
  const px = PX[size]
  const editable = !readOnly && !!onChange

  function set(n: number | undefined) {
    if (!editable) return
    onChange!(n)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!editable) return
    const cur = value ?? 0
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      set(Math.min(max, cur + 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      // Stepping below 1 goes to UNSET, not to 0 — there is no zero on this
      // scale, and arrowing left off the end is how a keyboard user clears.
      set(cur <= 1 ? undefined : cur - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      set(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      set(max)
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      set(undefined)
    }
  }

  const stars = Array.from({ length: max }, (_, i) => i + 1)

  return (
    <div
      className={className ? `cg-stars ${className}` : 'cg-stars'}
      style={style}
      data-size={size}
      role={editable ? 'radiogroup' : undefined}
      aria-label={editable ? label : undefined}
      aria-readonly={readOnly || undefined}
      onKeyDown={onKeyDown}
    >
      {stars.map(n => {
        const on = value !== undefined && n <= value
        if (!editable) {
          return (
            <span key={n} className="cg-star" data-on={on || undefined}>
              <Star px={px} />
            </span>
          )
        }
        return (
          <button
            key={n}
            type="button"
            className="cg-star"
            data-on={on || undefined}
            role="radio"
            aria-checked={value === n}
            aria-label={`${label}: ${n} of ${max}`}
            // ROVING TABINDEX. The focused star is the selected one, or the
            // first when nothing is selected — so one Tab reaches the row and
            // the next Tab leaves it, however many stars it holds.
            tabIndex={value === n || (value === undefined && n === 1) ? 0 : -1}
            // Clicking the star you are on CLEARS. See the docblock — this is
            // the only way back to "never asked".
            onClick={() => set(value === n ? undefined : n)}
          >
            <Star px={px} />
          </button>
        )
      })}
    </div>
  )
}
