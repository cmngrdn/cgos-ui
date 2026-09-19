'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { placeMenu, type MenuPlacement } from '../lib/menu-placement'

/**
 * Popover — the React shell around `lib/menu-placement`.
 *
 * WHY THIS EXISTS, and it is one bug rather than a preference. `placeMenu`
 * shipped in v0.60.x and is the platform's answer to "where does a floating
 * panel go": below the trigger, above it when below is short, clamped
 * horizontally, capped to the room it has. `ControlChip`, `AudienceDropdown`
 * and `QuickReplyDropdown` use it. **The composer's emoji picker did not** —
 * it stayed on `position: absolute; top: calc(100% + 4px); right: 0`, which
 * opens downward and rightward unconditionally.
 *
 * At the bottom of an inspector, where a message composer's toolbar lives,
 * that puts the panel below the fold and behind the rail's edge. Feather,
 * 2026-09-19: *"when clicking the emoji button you can't see the emoji picker
 * it disappears off behind the left side inspectors edge so its completely
 * unusable"* — and, because the search field is the panel's first row, *"it's
 * just a really small select list"*, of a picker that has had the full ~1,780
 * set since task #182. One unreachable input made a finished feature read as
 * an unfinished one.
 *
 * THE RULE WAS NOT MISSING, THE ADOPTION WAS. So this adds no placement maths.
 * What it adds is the part every callsite was re-writing badly around it: the
 * portal, the outside-click, Escape, and re-placing on scroll and resize. Six
 * components in cmngrdn hand-roll those four (`LibrarySelectMenu`, `TagSelect`,
 * `StatusChip`, `DateField`, `AudienceDropdown`, `QuickReplyDropdown`) and they
 * disagree — some close on scroll, which is a panel vanishing because the page
 * behind it moved a pixel.
 *
 * PORTALLED TO `<body>`, because the other half of the same bug is an ancestor
 * with `overflow: hidden` — an accordion, a scroll region, an inspector rail —
 * clipping a panel that is positioned perfectly well.
 *
 * MEASURED AFTER LAYOUT, NEVER GUESSED. The decision needs the panel's own
 * height, which is unknown until it renders, so the first paint is invisible
 * and the position is written in the same frame by `useLayoutEffect`. A guess
 * from a fixed max-height is wrong for every panel shorter than its maximum,
 * which is most of them.
 *
 * NOT A MODAL. No focus trap, no backdrop, no scroll lock — a popover is a
 * continuation of the control that opened it. Use `Modal` when the page behind
 * should stop existing.
 */

export interface PopoverProps {
  /** Whether the panel is shown. The trigger is the consumer's own control. */
  open: boolean
  onClose: () => void
  /**
   * The element to anchor to. A ref rather than a render-prop trigger: the
   * consumer's control is usually an `IconButton` or a chip that already
   * exists, and wrapping it would change its layout.
   */
  anchorRef: React.RefObject<HTMLElement | null>
  children: ReactNode
  /**
   * How wide the panel wants to be. `placeMenu` never renders it narrower than
   * the anchor, so a panel hanging off a 28px icon button gets this.
   */
  minWidth?: number
  /** How tall it wants to be when there is room. Capped to the room there is. */
  preferredHeight?: number
  /** Extra class on the panel. */
  className?: string
  role?: 'menu' | 'dialog' | 'listbox'
  ariaLabel?: string
}

export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  minWidth = 240,
  preferredHeight = 320,
  className,
  role = 'menu',
  ariaLabel,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<MenuPlacement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const measure = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    setPos(
      placeMenu({
        anchor: r,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        minWidth,
        // The panel's OWN height when it has one, so a short panel is not
        // given a tall panel's placement. `scrollHeight` rather than
        // `offsetHeight`: the CSS caps the box, and the cap is what we are
        // trying to compute.
        preferredHeight: panelRef.current?.scrollHeight || preferredHeight,
      }),
    )
  }, [anchorRef, minWidth, preferredHeight])

  // BEFORE PAINT, so the panel is never seen in the wrong place. `pos === null`
  // renders it hidden purely to be measured; the same frame positions it. A
  // `useEffect` here produces a visible one-frame jump.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    measure()
  }, [open, measure, children])

  // Re-place on anything that moves the anchor. Deliberately NOT "close on
  // scroll", which three of the hand-rolled menus do: closing a picker because
  // the thread behind it scrolled is the panel disappearing mid-use.
  useEffect(() => {
    if (!open) return
    const onChange = () => measure()
    window.addEventListener('resize', onChange)
    window.addEventListener('scroll', onChange, true)
    return () => {
      window.removeEventListener('resize', onChange)
      window.removeEventListener('scroll', onChange, true)
    }
  }, [open, measure])

  // Outside click + Escape. `mousedown`, not `click`: a control inside the
  // panel that re-renders on press would otherwise lose its own click to a
  // close that fired first.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchorRef])

  if (!open || !mounted) return null

  const style: CSSProperties = pos
    ? {
        ...(pos.top !== undefined ? { top: pos.top } : {}),
        ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
        left: pos.left,
        minWidth: pos.minWidth,
        // A token rather than a hard height, so the panel's own CSS decides
        // what scrolls and a consumer can read it to size an inner region.
        ['--cg-popover-max-h' as string]: `${Math.round(pos.maxHeight)}px`,
      }
    : { top: 0, left: 0, minWidth, visibility: 'hidden' }

  return createPortal(
    <div
      ref={panelRef}
      data-cg-popover=""
      data-side={pos?.bottom !== undefined ? 'top' : 'bottom'}
      className={className ? `cg-popover ${className}` : 'cg-popover'}
      role={role}
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </div>,
    document.body,
  )
}
