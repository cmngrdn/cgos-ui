import { type ReactNode, type CSSProperties } from 'react'
import './GlyphToggleRow.css'

/**
 * `<GlyphToggleRow>` — a fixed set of independent flags, as one row of marks.
 *
 * ## The question it answers
 *
 * *Which of these few things is true about this record?* Several can be true at
 * once, the set is short and known, and each member is recognisable as a shape
 * or a two-character rung rather than needing a sentence.
 *
 * Crew badges are the first consumer: crew lead, forklift, and the four audio /
 * lighting rungs. Feather, 2026-09-19: *"a clickable glyph is better than a
 * toggle with text… tapping one lights it up, tapping it again turns it off —
 * multiple may be on at the same time."*
 *
 * ## Why not `ChipMultiSelect`, and why not six `Toggle`s
 *
 * `ChipMultiSelect` hides the options behind a menu. That is right for a filter
 * over an open-ended vocabulary, and wrong here: the whole value is seeing at a
 * glance which of six badges a person carries, which a closed menu cannot do.
 *
 * Six `Toggle`s with labels is what this replaces. It cost six rows, and read
 * as six unrelated decisions rather than one row of related facts — the same
 * argument `SegmentedPicker` makes about a chip row, one axis over: **a shared
 * track reads as one question, gaps read as separate ones.**
 *
 * ## `mark`, not `icon`
 *
 * An item's mark is a glyph for a THING (a crown, a forklift) and a short
 * string for a RUNG (`A2`, `L3`). Feather considered glyphs for the rungs and
 * they are the wrong tool: a rung is a position on a ladder, not an object, so
 * the numeral already carries the entire meaning and any glyph would carry
 * none of it. `tone` supplies the discipline tint that says WHICH ladder.
 *
 * ## `label` is required and is never rendered as body text
 *
 * A row of shapes is unreadable to a screen reader and ambiguous to a new
 * operator. Every item carries a full label, which becomes `aria-label` and the
 * hover `title` — the same contract `IconButton` has. It is not optional, and
 * it is not the visible mark.
 *
 * ## Full width by default
 *
 * Feather: *"Both the badges, call list tier, and shirt size pickers can expand
 * to fill the whole width of the standard inspector width. Currently they're
 * left aligned. Might help click ability on phone too."* So items share the row
 * equally unless `fill={false}`. On a coarse pointer that is most of the touch
 * target's width for free.
 */

export interface GlyphToggleItem {
  /** Stable value. What lands in `value` / `onChange`. */
  value: string
  /**
   * Full human name — `aria-label` and hover `title`, never visible body text.
   * Required: see the docblock.
   */
  label: string
  /**
   * What is DRAWN. A glyph node for a thing (crown, forklift); a short string
   * for a rung (`A2`). Two or three characters at most — this is a mark, not a
   * label, and the row's geometry assumes it.
   */
  mark: ReactNode
  /**
   * Accent family when lit. Defaults to the accent. Use it to say which LADDER
   * a rung belongs to (audio vs lighting), not to rank importance.
   */
  tone?: 'accent' | 'info' | 'success' | 'warning' | 'danger'
  /** Not settable right now — a fixed fact, a read-only viewer. */
  disabled?: boolean
}

export interface GlyphToggleRowProps {
  items: GlyphToggleItem[]
  /** Values currently on. Order is irrelevant; membership is the state. */
  value: string[]
  /** Called with the FULL next list, never a delta. */
  onChange: (next: string[]) => void
  /**
   * What the row is — "Badges", "Certifications". `aria-label` on the group.
   * Required for the same reason each item's `label` is.
   */
  label: string
  /** Items share the row equally. `false` packs them left. Default true. */
  fill?: boolean
  /** Nothing is settable. Lit items stay lit; the rest recede. */
  readOnly?: boolean
  style?: CSSProperties
  className?: string
}

export function GlyphToggleRow({
  items,
  value,
  onChange,
  label,
  fill = true,
  readOnly = false,
  style,
  className,
}: GlyphToggleRowProps) {
  const on = new Set(value)

  function toggle(v: string) {
    if (readOnly) return
    const next = new Set(on)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    // Emitted in ITEM order rather than click order, so two records carrying
    // the same badges produce the same array and a dirty-check on the field
    // does not fire because somebody clicked them in a different sequence.
    onChange(items.map(i => i.value).filter(v2 => next.has(v2)))
  }

  return (
    <div
      className={className ? `cg-glyphrow ${className}` : 'cg-glyphrow'}
      style={style}
      data-fill={fill || undefined}
      role="group"
      aria-label={label}
    >
      {items.map(item => {
        const lit = on.has(item.value)
        return (
          <button
            key={item.value}
            type="button"
            className="cg-glyphtoggle"
            data-on={lit || undefined}
            data-tone={item.tone ?? 'accent'}
            // `aria-pressed`, not `aria-checked` — these are independent
            // toggles, not a radiogroup. A screen reader should say "pressed",
            // because turning one on says nothing about the others.
            aria-pressed={lit}
            aria-label={item.label}
            title={item.label}
            disabled={readOnly || item.disabled}
            onClick={() => toggle(item.value)}
          >
            <span className="cg-glyphtoggle-mark">{item.mark}</span>
          </button>
        )
      })}
    </div>
  )
}
