'use client'

/**
 * VirtualList — render only the rows that fit in the viewport (plus a small
 * overscan buffer above and below), no matter how many rows the caller hands
 * us. Built for HQ list pages where the data set can run 1,000+ rows
 * (Audience, Inquiries with historical migration, Appointments, SMS Inbox).
 *
 * The user-visible effect: first-paint is bound to the height of the
 * scrollable container, not the size of the dataset. A 50,000-row list
 * renders in the same time as a 50-row list.
 *
 * No external dependencies. The math is straightforward: total rows × row
 * height = total height; from scroll position + container height we know
 * which row indices are visible; render those + an overscan margin so
 * fast scrolling doesn't show blank rows during repaint.
 *
 * Trade-offs locked in:
 *   - Fixed-height rows. Each row must render at exactly `rowHeight`px tall.
 *     For variable-height lists, switch to a dedicated library
 *     (@tanstack/react-virtual) — but every HQ list today uses a uniform
 *     row spec from `cgos-ui/docs/list-row-template.md`, so this works.
 *   - Container is its own scroll context — caller gives it a bounded
 *     height (typically `flex: 1` inside the page layout, or an explicit
 *     `maxHeight`). Won't work nested inside a parent that's already
 *     scrolling the whole page; that's a deliberate constraint.
 *   - No horizontal virtualization — vertical only.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

export interface VirtualListProps {
  /** Total number of rows the list contains. */
  count: number
  /**
   * Pixel height of each row (must be uniform). Measure your row component
   * once — including any vertical padding/margin — and pass it here.
   */
  rowHeight: number
  /**
   * Render the row at the given index. Called only for rows currently in
   * the visible window + overscan; never called for the rest. Wrap any
   * derivation that depends on `index` in your own memo if it's expensive.
   */
  renderRow: (index: number) => ReactNode
  /**
   * Extra rows to render above and below the visible window — eats the
   * blank-frame flash during fast scroll. Default 6 covers ~half a screen
   * at 56px rows on most laptops.
   */
  overscan?: number
  /**
   * Optional pixel gap between rows. Rendered as margin-bottom on each row
   * except the last visible one. If you use this, your `rowHeight` should
   * include the gap (so the math stays consistent with the spacer divs).
   */
  className?: string
  style?: CSSProperties
  /** Optional ARIA role override. Defaults to `list`. */
  role?: string
  /** Optional ARIA label. */
  'aria-label'?: string
}

export function VirtualList({
  count,
  rowHeight,
  renderRow,
  overscan = 6,
  className,
  style,
  role = 'list',
  'aria-label': ariaLabel,
}: VirtualListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  // Track scroll position. Passive listener — we don't preventDefault. We
  // intentionally read scrollTop directly from the event target rather than
  // calling getBoundingClientRect every frame.
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop)
  }, [])

  // Track viewport height via ResizeObserver so the visible window stays
  // correct across responsive layout changes (sidebar collapse, browser
  // resize, devtools open/close).
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setViewportHeight(el.clientHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Render bounds.
  const { startIndex, endIndex, beforePad, afterPad } = useMemo(() => {
    if (rowHeight <= 0 || count <= 0) {
      return { startIndex: 0, endIndex: 0, beforePad: 0, afterPad: 0 }
    }
    const first = Math.floor(scrollTop / rowHeight)
    const visibleCount = Math.ceil(viewportHeight / rowHeight)
    const start = Math.max(0, first - overscan)
    const end = Math.min(count, first + visibleCount + overscan)
    return {
      startIndex: start,
      endIndex: end,
      beforePad: start * rowHeight,
      afterPad: Math.max(0, (count - end) * rowHeight),
    }
  }, [scrollTop, viewportHeight, rowHeight, count, overscan])

  // Reset scroll when the dataset changes drastically — guards against a
  // scrollTop that overshoots the new total height (e.g., apply a filter
  // that drops 1,000 → 50 rows and the cached scrollTop would otherwise
  // point past the new bottom).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const max = Math.max(0, count * rowHeight - el.clientHeight)
    if (el.scrollTop > max) {
      el.scrollTop = max
      setScrollTop(max)
    }
  }, [count, rowHeight])

  const rows: ReactNode[] = []
  for (let i = startIndex; i < endIndex; i++) {
    rows.push(renderRow(i))
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={className}
      role={role}
      aria-label={ariaLabel}
      style={{
        overflowY: 'auto',
        ...style,
      }}
    >
      {beforePad > 0 && (
        <div style={{ height: beforePad }} aria-hidden="true" />
      )}
      {rows}
      {afterPad > 0 && (
        <div style={{ height: afterPad }} aria-hidden="true" />
      )}
    </div>
  )
}
