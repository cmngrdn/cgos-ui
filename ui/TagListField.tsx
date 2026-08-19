'use client'

/**
 * `<TagListField>` — the chip editor for a set of tags on a record.
 *
 * ## Why this is an atom and not a component in one app
 *
 * Two cmngrdn surfaces ask the same question — *who does this person become
 * when they come through here* — and each had its own answer. Inquiry forms had
 * a chip list over `intake_forms.auto_tags text[]`, hand-rolled inside the
 * form's Details tab. Portal pages had a bare text input over a SINGLE
 * `capture_auto_tag text` column, three levels down inside the Capture module,
 * where somebody typed `'wafeo, '` trying to enter two tags and got one named
 * `wafeo`. The control never said no, because a text column cannot.
 *
 * The schema was unified (cgos `20260819143802`) and the control with it. It
 * lives here because tagging is not a Library concept or a Service concept —
 * audience, crew, collectibles and quests all reach for the same shape, and the
 * next surface that needs one should import rather than copy. That is the same
 * reasoning that moved `SocialBrandIcon` and `ModuleIconChip` here.
 *
 * ## Normalization is the CALLER's contract, not this atom's
 *
 * Tag normalization is a platform rule with a Postgres implementation
 * (`normalize_tags_array`) and per-app mirrors (`@/lib/tag-normalize` in
 * cmngrdn, `awen/tags.py` in cgos). An atom that shipped its own regex would
 * become a fourth definition of that contract and drift from the trigger that
 * actually decides what gets stored.
 *
 * So `normalize` is a REQUIRED prop. Passing it is what makes
 * `tags.includes(value)` a real duplicate check rather than a case-sensitive
 * near-miss — which is the bug class the tag-normalize helpers exist to
 * prevent. Returning an empty string rejects the input.
 *
 * ## Comma commits, because that is what people type
 *
 * Enter and comma both commit, and blur commits whatever is left in the field.
 * The production evidence is that a trailing `', '` is how somebody reaches for
 * a second tag, so the separator they already use should work rather than
 * silently becoming part of the tag.
 */

import { useCallback, useState } from 'react'
import './TagListField.css'

export interface TagListFieldProps {
  tags: string[]
  /** Called with the full next list. The caller owns persistence. */
  onChange: (next: string[]) => void
  /**
   * Slug-normalize one tag. REQUIRED — see the note above on why this atom
   * does not ship its own. Return `''` to reject the input.
   */
  normalize: (raw: string) => string
  disabled?: boolean
  /** Shown while the list is empty; a shorter one is used once it isn't. */
  placeholder?: string
  ariaLabel?: string
}

export function TagListField({
  tags,
  onChange,
  normalize,
  disabled = false,
  placeholder,
  ariaLabel = 'Tags',
}: TagListFieldProps) {
  const [draft, setDraft] = useState('')

  const add = useCallback(
    (raw: string) => {
      const v = normalize(raw)
      if (!v || tags.includes(v)) return
      onChange([...tags, v])
    },
    [tags, onChange, normalize],
  )

  const remove = useCallback(
    (t: string) => onChange(tags.filter((x) => x !== t)),
    [tags, onChange],
  )

  return (
    <div className="cg-taglist" data-cg-taglist>
      {tags.map((t) => (
        <span key={t} className="cg-taglist-chip">
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            disabled={disabled}
            aria-label={`Remove tag ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        disabled={disabled}
        placeholder={
          tags.length === 0
            ? (placeholder ?? 'Add a tag and press Enter…')
            : 'Add another…'
        }
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(draft)
            setDraft('')
          } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
            remove(tags[tags.length - 1])
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            add(draft)
            setDraft('')
          }
        }}
      />
    </div>
  )
}
