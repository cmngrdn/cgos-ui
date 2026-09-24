'use client'

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Input } from './Input'

/**
 * SearchPicker — type a few letters, arrow to a row, ↵ picks it.
 *
 * HOISTED FROM cmngrdn `AddToPeriodSearch` (payroll's Names tab, 2026-09-23),
 * because the SMS inbox's "To:" field needed exactly the same control and a
 * fourth hand-rolled copy was the alternative — the audience people picker and
 * the contact merge picker are the other two, each with its own keyboard
 * story. Feather: *"it seems to work pretty well for adding people … build the
 * search as a shared component."* The rules below each came from that surface:
 *
 * THE RESULTS FLOAT, THEY DO NOT PUSH. The list is an overlay anchored under
 * the field, so typing never moves anything beneath it (*"the box moves all
 * over while typing"* was the modal this replaced).
 *
 * THE KEYBOARD IS THE PRIMARY INPUT. ↓/↑ walk the rows, ↵ picks, and the
 * active index walks PICKABLE rows only — ↓ never lands on somebody ↵ cannot
 * pick. Rows are picked on `mousedown` with `preventDefault`, which fires
 * before focus moves, so the field keeps focus.
 *
 * UNPICKABLE ROWS STAY IN THE LIST, marked with why. Searching a name you
 * expect to find must always answer: "not found" for somebody who is already
 * added, or cannot be texted, sends an operator off to create a duplicate. The
 * consumer sorts them last; this atom only refuses to land on them.
 *
 * ESCAPE IS SWALLOWED ONLY WHEN THERE IS SOMETHING TO BACK OUT OF. An inspector
 * binds Esc on `document`, which React's synthetic `stopPropagation` does not
 * reach, so this uses `nativeEvent.stopImmediatePropagation()` — and only
 * while a query is typed. An empty field lets Esc close the surface around it.
 *
 * PRESENTATIONAL. The query is the consumer's (`query` + `onQueryChange`); it
 * filters or fetches and hands back `options` already sorted. That is what
 * lets one consumer filter an in-memory roster and another query the database
 * without this knowing which.
 */

export interface SearchPickerOption {
  id: string
  label: string
  /** Second line — a phone, an email, what makes two same-named people differ. */
  detail?: string
  /** Trailing text on the row. Shown on every row when set; `pickHint` is the
   *  active row's fallback when it is not. */
  hint?: string
  /** Shown, dimmed, never landed on. Put the reason in `hint`. */
  disabled?: boolean
}

export interface SearchPickerHandle {
  focus: () => void
}

export interface SearchPickerProps {
  query: string
  onQueryChange: (next: string) => void
  /** Already filtered and sorted, pickable first. Slice before passing. */
  options: SearchPickerOption[]
  onPick: (option: SearchPickerOption) => void
  placeholder?: string
  /** Accessible name — the field often has no visible label. */
  ariaLabel: string
  /** Before the text: a magnifier, or a "To:" label. */
  leading?: ReactNode
  /** Beside the field, outside it: a "New employee" button. */
  trailing?: ReactNode
  /**
   * Drawn INSIDE the field's trailing edge, only while it is empty, so it can
   * never sit on something being typed — "Added Adam Gerard". Feedback here
   * moves nothing; a note line under the field pushes the page on every pick.
   */
  status?: ReactNode
  /** Trailing text on the active row when it has no `hint`. */
  pickHint?: string
  /** A query is typed and `options` is empty. Omit for a plain sentence. */
  empty?: ReactNode
  /** Matches beyond the ones passed — says "keep typing". */
  moreCount?: number
  /** Results are being fetched. Shown only while there is nothing to show. */
  loading?: boolean
  /** Clear the field after a pick and keep focus — for entering many in a row. */
  clearOnPick?: boolean
  autoFocus?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export const SearchPicker = forwardRef<SearchPickerHandle, SearchPickerProps>(function SearchPicker(
  {
    query,
    onQueryChange,
    options,
    onPick,
    placeholder,
    ariaLabel,
    leading,
    trailing,
    status,
    pickHint = '↵',
    empty,
    moreCount = 0,
    loading = false,
    clearOnPick = false,
    autoFocus = false,
    size = 'sm',
    className,
  },
  ref,
) {
  const [open, setOpen] = useState(autoFocus)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), [])

  const pickable = options.filter((o) => !o.disabled)
  // Clamped: the option set changes under the cursor on every key.
  const activeIdx = Math.min(active, Math.max(0, pickable.length - 1))
  const activeId = pickable[activeIdx]?.id ?? null

  // Keep the active row in view as ↑/↓ walk past the overlay's edge.
  useEffect(() => {
    if (!activeId) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-id="${CSS.escape(activeId)}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  // Close on a click anywhere else. Blur alone is not enough: clicking a row
  // would blur the field before the pick registers.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function pick(o: SearchPickerOption) {
    if (o.disabled) return
    if (clearOnPick) {
      onQueryChange('')
      setActive(0)
      inputRef.current?.focus()
    } else {
      setOpen(false)
    }
    onPick(o)
  }

  function onKeyDown(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      setOpen(true)
      setActive(Math.min(activeIdx + 1, Math.max(0, pickable.length - 1)))
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      setActive(Math.max(activeIdx - 1, 0))
    } else if (ev.key === 'Enter') {
      ev.preventDefault()
      const target = pickable[activeIdx]
      if (target) pick(target)
    } else if (ev.key === 'Escape' && query) {
      ev.preventDefault()
      ev.nativeEvent.stopImmediatePropagation()
      onQueryChange('')
    }
  }

  const typed = query.trim().length > 0
  const showResults = open && typed

  return (
    <div className={className ? `cg-search-picker ${className}` : 'cg-search-picker'} ref={wrapRef}>
      <div className="cg-search-picker-field" data-has-leading={leading ? '' : undefined}>
        {leading && <span className="cg-search-picker-leading">{leading}</span>}
        <Input
          ref={inputRef}
          size={size}
          className="cg-search-picker-input"
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus={autoFocus}
          data-1p-ignore
          data-lpignore="true"
          role="combobox"
          aria-expanded={showResults}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showResults && activeId ? `${listId}-${activeId}` : undefined}
          aria-label={ariaLabel}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {status && !query && (
          <span className="cg-search-picker-status" role="status">
            {status}
          </span>
        )}
      </div>
      {trailing}

      {showResults && (
        <div className="cg-search-picker-results">
          {options.length === 0 ? (
            <div className="cg-search-picker-empty">
              {loading ? 'Searching…' : (empty ?? <span>Nothing matches “{query.trim()}”.</span>)}
            </div>
          ) : (
            <ul className="cg-search-picker-list" id={listId} role="listbox" ref={listRef}>
              {options.map((o) => {
                const isActive = o.id === activeId
                const hint = o.hint ?? (isActive ? pickHint : '')
                return (
                  <li
                    key={o.id}
                    id={`${listId}-${o.id}`}
                    data-id={o.id}
                    role="option"
                    aria-selected={isActive}
                    aria-disabled={o.disabled || undefined}
                    className="cg-search-picker-row"
                    data-active={isActive || undefined}
                    data-disabled={o.disabled || undefined}
                    onMouseDown={(ev) => {
                      ev.preventDefault()
                      pick(o)
                    }}
                    onMouseEnter={() => {
                      if (!o.disabled) setActive(pickable.findIndex((p) => p.id === o.id))
                    }}
                  >
                    <span className="cg-search-picker-who">
                      <span className="cg-search-picker-label">{o.label}</span>
                      {o.detail && <span className="cg-search-picker-detail">{o.detail}</span>}
                    </span>
                    {hint && <span className="cg-search-picker-hint">{hint}</span>}
                  </li>
                )
              })}
            </ul>
          )}
          {moreCount > 0 && (
            <div className="cg-search-picker-more">
              {moreCount} more — keep typing to narrow it
            </div>
          )}
        </div>
      )}
    </div>
  )
})
