import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'

/**
 * ControlChip — pill / segmented-control atom family.
 *
 * Sub-atoms:
 *  - ChipToggle      — label-only flip (`active` boolean), shape='pill' for
 *                      on/off toggles, 'rect' (default) for filters
 *  - ChipSelect      — single-select dropdown. Menu closes on pick. Reserve for
 *                      truly mutually-exclusive choices (sort field, lens
 *                      All/Own/Held, view mode).
 *  - ChipMultiSelect — multi-select dropdown with checkbox affordance + auto
 *                      search-within when options > 8. Menu stays open on
 *                      toggle. Use for every filter where 2+ selections make
 *                      sense (status, type, tag, channel, calendar).
 *  - ChipGroup       — segmented-control shell hosting a row of ChipSegment
 *                      children. `size='sm'` (default, 28px) for filter-row
 *                      contexts; `size='md'` (40px) for form bodies where the
 *                      group sits alongside Input/Select md. Size flows down
 *                      to nested ChipSegments via context — never set it on
 *                      individual segments.
 *  - ChipSegment     — segment inside a ChipGroup. Reads size from context.
 *
 * ChipToggle / ChipSelect / ChipMultiSelect are 28px filter-row chips. Use
 * ChipGroup + ChipSegment for mutually-exclusive in-place choices (including
 * within form bodies, where `size='md'` lines up with Input/Select md height).
 *
 * ChipSelect + ChipMultiSelect share the same portal-rendered menu chrome
 * (closes on outside click + scroll + resize + Esc so the anchor never goes
 * stale).
 *
 * Companion CSS at `cgos-ui/ui/ControlChip.css` carries the menu-item hover
 * + focus-visible ring (lifts the inline JS hover handlers from the dashboard
 * original). Auto-loaded via `cgos-ui/index.css`.
 */

const BASE: CSSProperties = {
  height: '28px',
  padding: '0 12px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  fontSize: '11px',
  fontWeight: 500,
  fontFamily: 'var(--cg-font)',
  borderRadius: '6px',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition:
    'border-color var(--cg-duration-fast), background var(--cg-duration-fast), color var(--cg-duration-fast)',
  boxSizing: 'border-box',
  flexShrink: 0,
}

function shapeRadius(shape?: 'pill' | 'rect'): string {
  return shape === 'pill' ? '999px' : '6px'
}

function activeStyle(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? 'var(--cg-accent-dim)' : 'var(--cg-border)'}`,
    background: active ? 'var(--cg-accent-subtle)' : 'transparent',
    color: active ? 'var(--cg-accent)' : 'var(--cg-text-secondary)',
  }
}

export interface ChipToggleProps {
  label: string
  active: boolean
  onClick: () => void
  shape?: 'pill' | 'rect'
}

/** Toggle chip — label only, flips accent on/off. */
export function ChipToggle({ label, active, onClick, shape }: ChipToggleProps) {
  return (
    <button
      type="button"
      data-cg-chip=""
      style={{ ...BASE, borderRadius: shapeRadius(shape), ...activeStyle(active) }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export interface ChipSelectProps {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  labelFor?: (v: string) => string
  shape?: 'pill' | 'rect'
  noBorder?: boolean
}

/** Dropdown chip — opens a portal-rendered menu on click. */
export function ChipSelect({
  label,
  value,
  options,
  onChange,
  labelFor,
  shape,
  noBorder,
}: ChipSelectProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number }>({
    top: 0,
    left: 0,
    minWidth: 140,
  })
  const active = value !== ''

  // Measure button and position the menu beneath it.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: r.left, minWidth: Math.max(140, r.width) })
  }, [open])

  // Close on outside click — mousedown so we beat the menu item's click.
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    // Scroll listener uses capture so it fires for any scrolling descendant.
    // Skip scrolls inside the menu itself — otherwise scrolling a long option
    // list closes the menu, making it unusable.
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const display = active ? (labelFor ? labelFor(value) : value) : label

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-cg-chip=""
        style={{
          ...BASE,
          borderRadius: shapeRadius(shape),
          ...(noBorder
            ? { border: 'none', background: 'transparent', color: 'var(--cg-text-secondary)' }
            : activeStyle(active)),
        }}
        onClick={() => setOpen(o => !o)}
      >
        {display}
        <Chevron />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            data-cg-chip-menu=""
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              minWidth: pos.minWidth,
              background: 'var(--cg-glass-bg)',
              WebkitBackdropFilter: 'var(--cg-glass-blur)',
              backdropFilter: 'var(--cg-glass-blur)',
              border: '1px solid var(--cg-glass-border)',
              borderRadius: 'var(--cg-glass-radius-md)',
              boxShadow: 'inset 0 1px 0 var(--cg-glass-border-top), var(--cg-elev-3)',
              padding: '4px',
              zIndex: 1000,
              animation: 'cg-modal-rise 140ms var(--cg-ease-entry)',
            }}
          >
            <MenuItem
              label={`All ${label.toLowerCase()}`}
              selected={value === ''}
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
            />
            {options.map(opt => (
              <MenuItem
                key={opt}
                label={labelFor ? labelFor(opt) : opt}
                selected={value === opt}
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
              />
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

export interface ChipMultiSelectProps {
  label: string
  value: string[]
  options: string[]
  onChange: (v: string[]) => void
  labelFor?: (v: string) => string
  shape?: 'pill' | 'rect'
  /** Render a search-within input when options.length exceeds this. Default 8. */
  searchThreshold?: number
  searchPlaceholder?: string
}

/**
 * Multi-select dropdown chip — checkbox-affordance menu that stays open while
 * the user toggles selections. Use when 2+ values make sense (status, tag,
 * channel, etc.); reserve ChipSelect for truly mutually-exclusive choices.
 *
 * Trigger label:
 *   value=[]           → 'Status'           (inactive, no accent)
 *   value=['live']     → 'Live'             (active, single value)
 *   value=['live','draft'] → 'Status · 2'   (active, label + count)
 *
 * Search input renders at top of the menu when options.length > searchThreshold
 * (default 8). Auto-focuses when opened so users can type immediately.
 *
 * Footer renders 'N selected · Clear' when value.length > 0. Clearing is the
 * only way to reset without unchecking each item.
 */
export function ChipMultiSelect({
  label,
  value,
  options,
  onChange,
  labelFor,
  shape,
  searchThreshold = 8,
  searchPlaceholder = 'Search…',
}: ChipMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number }>({
    top: 0,
    left: 0,
    minWidth: 180,
  })
  const active = value.length > 0
  const showSearch = options.length > searchThreshold

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: r.left, minWidth: Math.max(180, r.width) })
  }, [open])

  // Focus search input when opening so users can type immediately.
  useEffect(() => {
    if (open && showSearch && searchRef.current) {
      searchRef.current.focus()
    }
    if (!open) setQuery('')
  }, [open, showSearch])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    // Skip scrolls inside the menu — otherwise scrolling a long option list
    // closes the menu before the user can interact with it.
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const display =
    value.length === 0
      ? label
      : value.length === 1
        ? labelFor
          ? labelFor(value[0])
          : value[0]
        : `${label} · ${value.length}`

  const filteredOptions = query
    ? options.filter(o => {
        const text = labelFor ? labelFor(o) : o
        return text.toLowerCase().includes(query.toLowerCase())
      })
    : options

  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt))
    else onChange([...value, opt])
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-cg-chip=""
        style={{
          ...BASE,
          borderRadius: shapeRadius(shape),
          ...activeStyle(active),
        }}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {display}
        <Chevron />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            data-cg-chip-menu=""
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              minWidth: pos.minWidth,
              maxWidth: '320px',
              maxHeight: 'min(70vh, 480px)',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--cg-glass-bg)',
              WebkitBackdropFilter: 'var(--cg-glass-blur)',
              backdropFilter: 'var(--cg-glass-blur)',
              border: '1px solid var(--cg-glass-border)',
              borderRadius: 'var(--cg-glass-radius-md)',
              boxShadow: 'inset 0 1px 0 var(--cg-glass-border-top), var(--cg-elev-3)',
              padding: '4px',
              zIndex: 1000,
              animation: 'cg-modal-rise 140ms var(--cg-ease-entry)',
            }}
          >
            {showSearch && (
              <input
                ref={searchRef}
                type="text"
                data-cg-chip-menu-search=""
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  // 16px font-size prevents iOS Safari auto-zoom on focus.
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '6px 10px',
                  marginBottom: '4px',
                  fontSize: '16px',
                  fontFamily: 'var(--cg-font)',
                  color: 'var(--cg-text)',
                  background: 'var(--cg-bg-surface)',
                  border: '1px solid var(--cg-border)',
                  borderRadius: 'var(--cg-radius-sm)',
                  outline: 'none',
                }}
              />
            )}
            <div
              data-cg-chip-menu-list=""
              style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                minHeight: 0,
              }}
            >
              {filteredOptions.length === 0 ? (
                <div
                  style={{
                    padding: '10px 10px',
                    fontSize: '12px',
                    color: 'var(--cg-text-muted)',
                    fontFamily: 'var(--cg-font)',
                  }}
                >
                  No matches
                </div>
              ) : (
                filteredOptions.map(opt => (
                  <CheckboxMenuItem
                    key={opt}
                    label={labelFor ? labelFor(opt) : opt}
                    checked={value.includes(opt)}
                    onClick={() => toggle(opt)}
                  />
                ))
              )}
            </div>
            {value.length > 0 && (
              <div
                data-cg-chip-menu-footer=""
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  marginTop: '2px',
                  borderTop: '1px solid var(--cg-border-subtle)',
                  fontSize: '11px',
                  fontFamily: 'var(--cg-font)',
                  color: 'var(--cg-text-muted)',
                }}
              >
                <span>{value.length} selected</span>
                <button
                  type="button"
                  data-cg-chip-menu-item=""
                  onClick={() => onChange([])}
                  style={{
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontFamily: 'var(--cg-font)',
                    color: 'var(--cg-accent)',
                    borderRadius: 'var(--cg-radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

export type ChipGroupSize = 'sm' | 'md'

interface ChipGroupSizeTokens {
  height: string
  padding: string
  gap: string
  fontSize: string
  radius: string
  background: string
  segHeight: string
  segPadding: string
}

const GROUP_SIZE_TOKENS: Record<ChipGroupSize, ChipGroupSizeTokens> = {
  // sm — the original 28px chip-group. Filter rows, dense chrome.
  sm: {
    height: '28px',
    padding: '2px',
    gap: '2px',
    fontSize: '11px',
    radius: '6px',
    background: 'transparent',
    segHeight: '22px',
    segPadding: '0 8px',
  },
  // md — 40px segmented control. Form bodies where peers are Input/Select md.
  // Tinted bg so the group reads as one filled control (the segments visually
  // "live inside" a surface rather than floating in a hairline frame).
  md: {
    height: '40px',
    padding: '3px',
    gap: '2px',
    fontSize: '13px',
    radius: 'var(--cg-radius-md)',
    background: 'var(--cg-bg)',
    segHeight: '32px',
    segPadding: '0 12px',
  },
}

const ChipGroupSizeContext = createContext<ChipGroupSize>('sm')

export interface ChipGroupProps {
  /** sm (default) — 28px filter-row chip. md — 40px form-body segmented control
   *  matching Input/Select `size="md"`. Use md whenever the group sits in a
   *  form body alongside text inputs / selects. */
  size?: ChipGroupSize
  children: ReactNode
}

/** Wrapper for a row of ChipSegment children inside one segmented-control shell. */
export function ChipGroup({ size = 'sm', children }: ChipGroupProps) {
  const tokens = GROUP_SIZE_TOKENS[size]
  return (
    <ChipGroupSizeContext.Provider value={size}>
      <div
        data-cg-chip-group=""
        data-cg-size={size}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: tokens.height,
          padding: tokens.padding,
          gap: tokens.gap,
          fontSize: tokens.fontSize,
          fontFamily: 'var(--cg-font)',
          borderRadius: tokens.radius,
          border: '1px solid var(--cg-border)',
          background: tokens.background,
          whiteSpace: 'nowrap',
          cursor: 'default',
          boxSizing: 'border-box',
          flexShrink: 0,
          transition:
            'border-color var(--cg-duration-fast), background var(--cg-duration-fast)',
        }}
      >
        {children}
      </div>
    </ChipGroupSizeContext.Provider>
  )
}

export interface ChipSegmentProps {
  active: boolean
  onClick: () => void
  title?: string
  children: ReactNode
}

export function ChipSegment({ active, onClick, title, children }: ChipSegmentProps) {
  const groupSize = useContext(ChipGroupSizeContext)
  const tokens = GROUP_SIZE_TOKENS[groupSize]
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      data-cg-chip-segment=""
      data-cg-size={groupSize}
      {...(active ? { 'data-active': '' } : {})}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: tokens.segHeight,
        padding: tokens.segPadding,
        borderRadius: '999px',
        fontSize: tokens.fontSize,
        fontWeight: 500,
        fontFamily: 'var(--cg-font)',
        background: active ? 'var(--cg-accent-subtle)' : 'transparent',
        color: active ? 'var(--cg-accent)' : 'var(--cg-text-secondary)',
        cursor: 'pointer',
        transition: 'background var(--cg-duration-fast), color var(--cg-duration-fast)',
      }}
    >
      {children}
    </button>
  )
}

function MenuItem({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-cg-chip-menu-item=""
      {...(selected ? { 'data-selected': '' } : {})}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box',
        padding: '6px 10px',
        fontSize: '12px',
        fontFamily: 'var(--cg-font)',
        color: selected ? 'var(--cg-accent)' : 'var(--cg-text)',
        borderRadius: 'var(--cg-radius-sm)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {selected && <CheckIcon />}
    </button>
  )
}

function CheckboxMenuItem({
  label,
  checked,
  onClick,
}: {
  label: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      data-cg-chip-menu-item=""
      {...(checked ? { 'data-selected': '' } : {})}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box',
        padding: '6px 10px',
        fontSize: '12px',
        fontFamily: 'var(--cg-font)',
        color: 'var(--cg-text)',
        borderRadius: 'var(--cg-radius-sm)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        data-cg-checkbox=""
        {...(checked ? { 'data-checked': '' } : {})}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: '14px',
          height: '14px',
          borderRadius: '3px',
          border: `1px solid ${checked ? 'var(--cg-accent)' : 'var(--cg-border)'}`,
          background: checked ? 'var(--cg-accent)' : 'transparent',
          transition: 'background var(--cg-duration-fast), border-color var(--cg-duration-fast)',
        }}
      >
        {checked && <CheckIconSmall />}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  )
}

function CheckIconSmall() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="var(--cg-bg)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3,8 7,12 13,4" />
    </svg>
  )
}

function Chevron() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.8 }}
    >
      <polyline points="3,5 6,8 9,5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3,8 7,12 13,4" />
    </svg>
  )
}
