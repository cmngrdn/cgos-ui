import type { CSSProperties, ReactNode } from 'react'

/**
 * EntityChip — a named thing, in a row of named things.
 *
 * The platform had grown four of these independently: the tag pill inlined in
 * cmngrdn's `InspectorTagsField`, a CSS copy of the same pill as `.cpv-tag-pill`
 * on the contact profile, the staffing surface's `MetaChip` for a show's venue
 * and client, and the lead line beside it. They agree on what they are — a
 * short label standing for a record, sitting in a wrapping row — and disagreed
 * on every pixel and every interaction.
 *
 * WHAT MAKES IT ONE ATOM RATHER THAN TWO. A tag and a venue look like the same
 * object to a reader, so they should behave like it: click the body to go to
 * the thing, click the × to unlink it. A tag is simply the case with nowhere
 * to go — omit `onClick` and it renders as a label with a ×. Nothing about the
 * chrome changes.
 *
 * EMPTY IS A STATE, NOT AN ERROR. `label={null}` renders `placeholder` in the
 * muted voice and drops the ×: "no venue" on a show nobody has linked yet is
 * information for billing, not a mistake by scheduling. It stays clickable,
 * because the way you fill it is to click it.
 *
 * TWO SIBLING BUTTONS, NEVER NESTED. A `<button>` inside a `<button>` is
 * invalid HTML and hydrates wrong in React; the root is a plain span holding
 * one button for the body and one for the ×.
 */

export interface EntityChipProps {
  /** The record's name. `null` renders `placeholder` and suppresses the ×. */
  label: string | null
  /** Shown when `label` is null — "no venue", "no client". */
  placeholder?: string
  /** What kind of thing this is. Becomes the tooltip and the aria prefix, so
   *  "Walker Arts Center" reads as "Venue: Walker Arts Center". */
  title?: string
  /** Leading glyph. Keep it to ~12px; the chip is 11px text. */
  icon?: ReactNode
  /** The chip body. Filled → open the record. Empty → pick one. */
  onClick?: () => void
  /** The ×. Omit for a chip that can't be unlinked. Never rendered on an
   *  empty chip — there is nothing to remove. */
  onRemove?: () => void
  /** Overrides the ×'s aria-label, which defaults to `Remove {label}`. */
  removeLabel?: string
  disabled?: boolean
  /**
   * `neutral` (default) is the glass chip that reads as chrome — a venue on a
   * show, where the row already says what it is. `accent` is the tinted,
   * uppercased treatment tags use, where the chip IS the content.
   */
  tone?: 'neutral' | 'accent'
  className?: string
}

const ROOT: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  maxWidth: '100%',
  borderRadius: '6px',
  fontFamily: 'var(--cg-font)',
  // The row this sits in wraps; a chip that broke mid-name would read as two.
  whiteSpace: 'nowrap',
}

export function EntityChip({
  label,
  placeholder = '—',
  title,
  icon,
  onClick,
  onRemove,
  removeLabel,
  disabled = false,
  tone = 'neutral',
  className,
}: EntityChipProps) {
  const filled = !!label
  // No × on an empty chip: there is nothing to unlink, and a × next to
  // "no venue" reads as an action that would do something.
  const removable = filled && !!onRemove && !disabled

  return (
    <span
      data-cg-entity-chip=""
      data-tone={tone}
      data-filled={filled ? '' : undefined}
      data-removable={removable ? '' : undefined}
      style={ROOT}
      className={className}
    >
      <button
        type="button"
        data-cg-entity-chip-body=""
        title={title}
        disabled={disabled}
        onClick={onClick}
        aria-label={
          filled
            ? title
              ? `${title}: ${label}`
              : (label as string)
            : title
              ? `Set ${title.toLowerCase()}`
              : placeholder
        }
      >
        {icon}
        <span data-cg-entity-chip-label="">{filled ? label : placeholder}</span>
      </button>
      {removable && (
        <button
          type="button"
          data-cg-entity-chip-remove=""
          aria-label={removeLabel ?? `Remove ${label}`}
          title={removeLabel ?? `Remove ${label}`}
          onClick={(e) => {
            // The body is a sibling, not a parent, so this cannot bubble into
            // it — but the chip often sits inside a row that has its own click
            // handler, and unlinking a venue should never also open the row.
            e.stopPropagation()
            onRemove?.()
          }}
        >
          ×
        </button>
      )}
    </span>
  )
}
