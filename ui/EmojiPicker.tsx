'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { IconButton } from './IconButton'
import { Popover } from './Popover'
import { searchEmoji, EMOJI_RESULT_LIMIT, type EmojiRow } from '../lib/emoji-search'

/**
 * EmojiPicker — curated-first emoji popover, with search over the full set.
 *
 * TWO TIERS, ON PURPOSE. The panel opens on a curated ~48 covering the
 * marketing/music vocabulary actually reached for, because that is one glance
 * and no typing. Search widens to every single-codepoint emoji (~1,780) by
 * official Unicode name.
 *
 * NO DEPENDENCY, NO BUNDLE COST. The data is generated from Python's stdlib
 * `unicodedata` by `scripts/generate-emoji-data.py` and imported DYNAMICALLY
 * the first time someone types — so the initial bundle pays nothing. Roughly
 * 16 KB gzipped when it does load, fetched once per session.
 *
 * MOVED HERE FROM cmngrdn IN v0.64.0, and the move is the fix. It lived in
 * `components/hq/dispatch/transmissions/`, styled by `transmissions.css`, with
 * `position: absolute; top: calc(100% + 4px); right: 0` — a panel that opens
 * downward and rightward unconditionally. At the bottom of an inspector, where
 * a composer's toolbar sits, that renders it below the fold and behind the
 * rail's edge: *"you can't see the emoji picker it disappears off behind the
 * left side inspectors edge so its completely unusable"*, and with the search
 * field being the panel's first row, *"it's only a few emojis"* — of a picker
 * that has had the full set since task #182. One unreachable input made a
 * finished feature read as an unfinished one.
 *
 * It now rides `Popover`, so it flips above the trigger when below is short
 * and clamps to the viewport, and it is reachable by every consumer rather
 * than one folder in one repo. The dispatch surfaces, the email reply, the
 * transmission builder and the social composer are all one import.
 *
 * SEARCH IS THE FIRST ROW AND STAYS THERE (sticky), because the curated grid is
 * the shortcut and the search is the actual feature. Insertion stays
 * cost-aware by construction: dropping an emoji into an SMS body flips it to
 * UCS-2, and the composer's meter reflects the segment jump in the same frame,
 * so the tradeoff is visible at the moment of choice. That is also why the
 * dataset excludes ZWJ sequences and skin-tone variants — they cost more
 * characters for the same encoding penalty.
 *
 * It knows nothing about the surface it sits on: give it `onSelect(emoji)`.
 */

const CATEGORIES: { label: string; items: string[] }[] = [
  {
    label: 'Smileys',
    items: ['😀', '😁', '😂', '🤣', '😊', '😍', '😎', '🥳', '😉', '😌', '🤩', '👀'],
  },
  {
    label: 'Gestures',
    items: ['👍', '👏', '🙌', '🙏', '✌️', '🤘', '💪', '👇', '👉', '➡️', '✅', '❌'],
  },
  {
    label: 'Music + space',
    items: ['🎵', '🎶', '🎧', '💿', '📀', '🎤', '🚀', '🪐', '🌙', '⭐', '✨', '💫'],
  },
  {
    label: 'Hearts + heat',
    items: ['🔥', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💯', '⚡'],
  },
]

export interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  disabled?: boolean
  /** Button size — matches whatever else is in the toolbar. Default `sm`. */
  size?: 'xs' | 'sm' | 'md'
}

export function EmojiPicker({ onSelect, disabled, size = 'sm' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [all, setAll] = useState<EmojiRow[] | null>(null)
  const anchorRef = useRef<HTMLSpanElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Load the full set on first keystroke, never on mount — this is the whole
  // reason the initial bundle is unaffected. Fetched once and kept for the
  // component's lifetime; `all` staying null just means search shows nothing
  // yet, which is a sub-frame window in practice.
  useEffect(() => {
    if (!query || all) return
    let cancelled = false
    void import('../lib/emoji-data').then((m) => {
      if (!cancelled) setAll(m.EMOJI_DATA)
    })
    return () => {
      cancelled = true
    }
  }, [query, all])

  // Ranking lives in lib/emoji-search so it can be asserted without rendering
  // (`npm run audit:emoji`). null = not searching, [] = no matches.
  const results = useMemo(() => {
    if (!query.trim() || !all) return null
    return searchEmoji(all, query)
  }, [query, all])

  // Reset the query each time the panel closes, so reopening is the curated
  // view rather than whatever was last searched.
  useEffect(() => {
    if (!open) setQuery('')
    else {
      // One frame, so the portal has mounted and been placed before focus
      // moves — focusing a node mid-placement scrolls the page to it.
      const t = setTimeout(() => searchRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  const rows = results ?? null

  return (
    <>
      <span ref={anchorRef} className="cg-emoji-anchor">
        <IconButton
          icon={<span aria-hidden>☺</span>}
          label="Insert emoji"
          size={size}
          variant="ghost"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        />
      </span>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        minWidth={248}
        preferredHeight={320}
        className="cg-emoji-panel"
        ariaLabel="Emoji"
      >
        <input
          ref={searchRef}
          type="search"
          className="cg-emoji-search"
          placeholder="Search all emoji…"
          aria-label="Search emoji"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // NO CREDENTIAL MANAGER ON A SEARCH FIELD. Safari and Chrome offer
          // "enable password autofill" over any unlabelled text input, and the
          // sheet covers the results the operator is typing to see. Nothing in
          // this system takes a password, so the correct answer everywhere is
          // to say so: `autocomplete="off"` for the browser, plus the two
          // vendor opt-outs 1Password and LastPass read.
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
        />

        {rows ? (
          rows.length ? (
            <div className="cg-emoji-cat">
              <div className="cg-emoji-cat-label">
                {rows.length === EMOJI_RESULT_LIMIT
                  ? `Top ${EMOJI_RESULT_LIMIT} matches`
                  : `${rows.length} match${rows.length === 1 ? '' : 'es'}`}
              </div>
              <div className="cg-emoji-grid">
                {rows.map(([emoji, name]) => (
                  <button
                    key={emoji}
                    type="button"
                    role="menuitem"
                    className="cg-emoji-item"
                    title={name}
                    aria-label={`Insert ${name}`}
                    onClick={() => {
                      onSelect(emoji)
                      setOpen(false)
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="cg-emoji-empty">No emoji named “{query.trim()}”.</div>
          )
        ) : (
          CATEGORIES.map((cat) => (
            <div key={cat.label} className="cg-emoji-cat">
              <div className="cg-emoji-cat-label">{cat.label}</div>
              <div className="cg-emoji-grid">
                {cat.items.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    role="menuitem"
                    className="cg-emoji-item"
                    aria-label={`Insert ${emoji}`}
                    onClick={() => {
                      onSelect(emoji)
                      setOpen(false)
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </Popover>
    </>
  )
}
