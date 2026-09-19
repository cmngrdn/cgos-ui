import { useMemo, useState, type CSSProperties } from 'react'
import { EntityChip } from './EntityChip'
import { Button } from './Button'
import { Input } from './Input'
import './TagPicker.css'

/**
 * `<TagPicker>` — search, pick or create a tag, with the current set beside it.
 *
 * ## Why this exists when `TagListField` already does
 *
 * `TagListField` is free-text entry over a set — right when the vocabulary is
 * whatever the operator types. It has no SEARCH, so the audience contact
 * inspector hand-rolled one, which is the control this hoists.
 *
 * That control has been through two rounds of Feather's feedback and both are
 * preserved here, because each was a real defect:
 *
 * **1. The add control must not move.** It used to sit at the END of the chip
 * wrap, so it moved every time a tag was added — and worse, it landed on a
 * different line on a ten-tag contact than on a two-tag one, so the muscle
 * memory built on one record was wrong on the next. It is the FIRST child and
 * takes `order: -2`, the only position that cannot move.
 *
 * **2. There is one control and it IS the field.** A `+` button used to reveal
 * the input. Feather: *"we don't need the plus button and the search entry
 * field. That's very redundant."* The button's whole job was summoning
 * something that always appears in the same place.
 *
 * ## What this fixes that the hand-rolled one did not
 *
 * **The match row reserved its height.** Matches appeared below the input only
 * while typing, so every keystroke that changed the match count shoved the
 * chips — and everything below them in the section — down and back up. The row
 * now occupies its line whether or not it is showing (`.cg-tagpicker-matches`
 * keeps `min-height` and toggles `visibility`, never `display`), so nothing
 * below a tag field ever reflows while you type.
 *
 * ## In flow, never in a popover
 *
 * The popover WAS the disruption: it covered the fields above, had to be
 * dismissed, and when its anchor sat low in a scroll container it rendered past
 * the visible edge — which is why one cut needed a `scrollIntoView` and the
 * next a `placement` prop. Both treated symptoms of the layer existing at all.
 * Matches render as the SAME chips as the tags below them, so picking one reads
 * as moving it down into the set rather than operating a menu.
 *
 * ## `normalize` is REQUIRED, and it is the caller's contract
 *
 * Tag normalization is a platform rule with a Postgres implementation
 * (`normalize_tags_array`) and per-app mirrors. An atom shipping its own regex
 * would be a fourth definition and would drift from the trigger that decides
 * what is actually stored. Passing it is what makes the duplicate check real
 * rather than a case-sensitive near-miss — and **create is offered only when
 * nothing matches the NORMALISED query**, which is what stops `Crew` becoming a
 * second `crew`.
 */

export interface TagPickerProps {
  /** Tags on this record. Rendered as accent chips after the field. */
  tags: string[]
  /** Every tag in the workspace, for the search. Already-applied ones filter out. */
  suggestions: string[]
  /** Called with the full next list. The caller owns persistence. */
  onChange: (next: string[]) => void
  /**
   * Slug-normalize one tag. REQUIRED — see the docblock. Return a falsy value
   * to REJECT the input.
   */
  normalize: (raw: string) => string | null | undefined
  /** Opening a tag's own record, when the consumer has one. Omit for inert chips. */
  onOpenTag?: (tag: string) => void
  /** Nothing is settable. Chips render without their ×. */
  readOnly?: boolean
  placeholder?: string
  /** How many matches to show before "keep typing". Default 8. */
  matchLimit?: number
  style?: CSSProperties
  className?: string
}

export function TagPicker({
  tags,
  suggestions,
  onChange,
  normalize,
  onOpenTag,
  readOnly = false,
  placeholder = 'Add tag…',
  matchLimit = 8,
  style,
  className,
}: TagPickerProps) {
  const [query, setQuery] = useState('')

  const q = query.trim()
  const normalised = q ? normalize(q) || '' : ''

  const matches = useMemo(() => {
    if (!q) return []
    const have = new Set(tags)
    const needle = q.toLowerCase()
    return suggestions.filter(s => !have.has(s) && s.toLowerCase().includes(needle))
  }, [q, suggestions, tags])

  // CREATE IS OFFERED ONLY WHEN NOTHING MATCHES THE NORMALISED QUERY. Typing
  // "Crew" when `crew` exists must offer the existing one, never a second.
  const canCreate =
    !!normalised &&
    !tags.includes(normalised) &&
    !suggestions.some(s => s === normalised)

  function add(raw: string) {
    const t = normalize(raw)
    if (!t || tags.includes(t)) {
      setQuery('')
      return
    }
    onChange([...tags, t])
    setQuery('')
  }

  function remove(tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  const showing = q.length > 0

  return (
    <div
      className={className ? `cg-tagpicker ${className}` : 'cg-tagpicker'}
      style={style}
    >
      {!readOnly && (
        <Input
          size="sm"
          className="cg-tagpicker-input"
          value={query}
          placeholder={placeholder}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            // ESCAPE CLEARS THE FIELD, AND ONLY THEN — and it must stop the
            // NATIVE event. Inspector chrome binds its Esc handler with
            // `document.addEventListener`, which React's synthetic
            // `stopPropagation` does not reach: the first version of this guard
            // read as if it worked and the whole panel still closed, throwing
            // away the record you were reading. With the field already empty
            // there is nothing to clear, so Escape is allowed through and means
            // what it means everywhere else.
            if (e.key === 'Escape' && query) {
              e.nativeEvent.stopImmediatePropagation()
              e.preventDefault()
              setQuery('')
            }
            // Enter takes the first match, or creates what you typed when
            // nothing matches — the two things you can mean, without reaching
            // for the mouse.
            if (e.key === 'Enter') {
              e.preventDefault()
              if (q) add(matches[0] ?? q)
            }
          }}
        />
      )}

      {/* THE ROW IS ALWAYS HERE. `visibility`, never `display` — see the
          docblock. Hiding it by unmounting is what made every keystroke shove
          the chips and everything below them. */}
      {!readOnly && (
        <div className="cg-tagpicker-matches" data-showing={showing || undefined}>
          {showing && (
            <>
              {matches.slice(0, matchLimit).map(t => (
                <EntityChip
                  key={t}
                  label={t}
                  tone="neutral"
                  title="Add this tag"
                  onClick={() => add(t)}
                />
              ))}
              {canCreate && (
                <Button size="xs" variant="ghost" onClick={() => add(q)}>
                  + Create {normalised}
                </Button>
              )}
              {!matches.length && !canCreate && (
                <span className="cg-tagpicker-none">Already on this record</span>
              )}
              {matches.length > matchLimit && (
                <span className="cg-tagpicker-none">
                  +{matches.length - matchLimit} more — keep typing
                </span>
              )}
            </>
          )}
        </div>
      )}

      {tags.map(t => (
        <EntityChip
          key={t}
          label={t}
          tone="accent"
          title="Tag"
          onClick={onOpenTag ? () => onOpenTag(t) : undefined}
          onRemove={readOnly ? undefined : () => remove(t)}
        />
      ))}
    </div>
  )
}
