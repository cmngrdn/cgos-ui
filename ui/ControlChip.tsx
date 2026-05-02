import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'

/**
 * ControlChip — the canonical 28px pill atom for every filter / view control.
 *
 * All four sub-atoms render at the same height / radius / font so the filter
 * row reads as one coherent system. Used everywhere a filter row appears
 * (LibraryFilters, audience filters, calendar nav, etc.).
 *
 * Sub-atoms:
 *  - ChipToggle  — label-only flip (`active` boolean), shape='pill' for on/off
 *                  toggles, 'rect' (default) for filters
 *  - ChipSelect  — opens a dropdown menu on click. Menu portal-renders so it
 *                  escapes any `overflow` ancestor (the mobile filter row is
 *                  horizontally scrollable). Closes on outside click + scroll
 *                  + resize so the anchor never goes stale
 *  - ChipGroup   — wrapper that hosts a row of ChipSegment children inside
 *                  one chip's visual shell (e.g. grid / list view toggle)
 *  - ChipSegment — segment inside a ChipGroup
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
    const onScroll = () => setOpen(false)
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
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
              background: 'var(--cg-bg-elevated)',
              border: '1px solid var(--cg-border)',
              borderRadius: 'var(--cg-radius-md)',
              boxShadow: 'var(--cg-elev-3)',
              padding: '4px',
              zIndex: 1000,
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

export interface ChipGroupProps {
  children: ReactNode
}

/** Wrapper for a row of ChipSegment children inside one chip shell. */
export function ChipGroup({ children }: ChipGroupProps) {
  return (
    <div
      data-cg-chip-group=""
      style={{
        ...BASE,
        padding: '2px',
        gap: '2px',
        cursor: 'default',
        border: '1px solid var(--cg-border)',
        background: 'transparent',
      }}
    >
      {children}
    </div>
  )
}

export interface ChipSegmentProps {
  active: boolean
  onClick: () => void
  title?: string
  children: ReactNode
}

export function ChipSegment({ active, onClick, title, children }: ChipSegmentProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      data-cg-chip-segment=""
      {...(active ? { 'data-active': '' } : {})}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '22px',
        padding: '0 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 500,
        fontFamily: 'var(--cg-font)',
        background: active ? 'var(--cg-accent-subtle)' : 'transparent',
        color: active ? 'var(--cg-accent)' : 'var(--cg-text-muted)',
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
