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

/**
 * The nearest ancestor that actually scrolls vertically, starting with `el`.
 *
 * "Actually" is two tests, and both are needed: `overflow-y` must permit it AND
 * there must be something to scroll. A container with `overflow-y: auto` whose
 * content fits is not the scroller — which is exactly the case that made this
 * function necessary, since `VirtualList` sets `auto` on itself unconditionally
 * and then renders at full height inside somebody else's scroll region.
 */
function scrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    const scrolls = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
    if (scrolls && node.scrollHeight > node.clientHeight + 1) return node
    node = node.parentElement
  }
  // Nothing bounded above us: the document itself is scrolling.
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement
}

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
  /**
   * Keep this row in view. Pass the index a keyboard selection is on; the list
   * scrolls the MINIMUM distance to bring it inside the viewport and does
   * nothing when it is already there.
   *
   * WHY THIS HAD TO EXIST HERE rather than in a consumer. A virtualized row
   * that is off screen is not in the DOM, so `document.querySelector(...)
   * .scrollIntoView()` — the obvious consumer-side answer — finds nothing and
   * silently does nothing. Arrow-key navigation past the visible window is
   * therefore impossible to build against a `VirtualList` from outside it, and
   * the SMS inbox's arrows read as "scroll" rather than "select" for exactly
   * that reason (Feather, 2026-09-19: *"it seems like it's more of a scroll
   * movement than a list selection movement… doesn't seem that you can arrow
   * up if the scroll is already at the top"*).
   *
   * MINIMUM DISTANCE, NOT CENTRED. Centring the selection makes every keypress
   * move the whole list under the operator's eyes, so the row they are reading
   * is never where they left it. Scrolling only when the row would otherwise
   * be cut off is how a native list behaves.
   *
   * `null`/`undefined` means "no selection" and never scrolls, so a surface
   * that has not adopted keyboard navigation is unaffected by this existing.
   */
  scrollToIndex?: number | null
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
  scrollToIndex = null,
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

  // Bring the selected row into view, by the minimum distance — see
  // `scrollToIndex`. Runs BEFORE paint so a keypress never shows a frame with
  // the selection off screen.
  //
  // ⚠️ IT SCROLLS WHICHEVER ELEMENT ACTUALLY SCROLLS, which is not always this
  // one. The header promises the container is its own scroll context, and the
  // SMS inbox does not honour that: it renders this list inside an `.hq-scroll`
  // that owns the page's scrolling, so `clientHeight === scrollHeight` here
  // (2,688 = 2,688, measured) and writing `scrollTop` on it moves nothing.
  // Scrolling a node that cannot scroll fails silently, which is the worst
  // shape a fix can have, so `scrollParent` walks up until it finds a node that
  // can — this element first.
  //
  // (That page is also getting no virtualization for the same reason: the
  // ResizeObserver measures the full list as the viewport, so every row mounts.
  // Worth fixing where it happens, not here — this only makes the scroll land.)
  // ⚠️ ONLY WHEN THE SELECTION MOVES. With `count` in the deps this re-scrolled
  // on every list change: arrow to row 3, mouse-scroll down to row 60, and a
  // single inbound message arriving (count +1) yanked the view back to row 3
  // under the operator's hands. The selection is the only thing that should
  // move the viewport, so the effect compares against what it last scrolled to
  // and does nothing when that has not changed. `count` and `rowHeight` stay in
  // the deps because the ARITHMETIC needs them; the ref is what stops them
  // being triggers.
  const scrolledTo = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || scrollToIndex == null || rowHeight <= 0) return
    if (scrolledTo.current === scrollToIndex) return
    scrolledTo.current = scrollToIndex
    const scroller = scrollParent(el)
    if (!scroller) return

    const i = Math.max(0, Math.min(count - 1, scrollToIndex))
    // The row's offset inside the SCROLLER, which is this container's own
    // offset plus the row's offset inside it. Identical to `i * rowHeight` in
    // the documented case, where the scroller IS this element.
    const offsetInScroller =
      scroller === el
        ? 0
        : el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    const top = offsetInScroller + i * rowHeight
    const bottom = top + rowHeight
    const viewTop = scroller.scrollTop
    const viewBottom = viewTop + scroller.clientHeight

    let next: number | null = null
    if (top < viewTop) next = top
    else if (bottom > viewBottom) next = bottom - scroller.clientHeight
    if (next === null) return

    const clamped = Math.max(0, Math.min(next, scroller.scrollHeight - scroller.clientHeight))
    scroller.scrollTop = clamped
    // The render window is derived from STATE, so when we are the scroller the
    // new position has to reach state too — setting only the node leaves the
    // newly-visible rows unrendered until the scroll event arrives a frame
    // later, which is a blank row exactly where the operator is looking.
    if (scroller === el) setScrollTop(clamped)
  }, [scrollToIndex, rowHeight, count])

  // Clearing the selection forgets where we scrolled, so re-selecting the same
  // row scrolls to it again rather than being mistaken for "already there".
  useEffect(() => {
    if (scrollToIndex == null) scrolledTo.current = null
  }, [scrollToIndex])

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
      {/* ⚠️ `flexShrink: 0` IS LOAD-BEARING. These spacers stand in for every row
          that is not rendered — `afterPad` is routinely tens of thousands of
          pixels — and a consumer whose class makes this container a flex column
          will shrink them to ZERO to fit, taking the scrollable range with
          them. Measured 2026-09-19 on Audience, whose `.aud-list` sets
          `display: flex`: 1,804 rows, `afterPad` should have been ~114,000px
          and rendered at 0, so the list could not scroll past its second
          screen. The atom defends its own geometry rather than trusting every
          consumer to know this. */}
      {beforePad > 0 && (
        <div style={{ height: beforePad, flexShrink: 0 }} aria-hidden="true" />
      )}
      {rows}
      {afterPad > 0 && (
        <div style={{ height: afterPad, flexShrink: 0 }} aria-hidden="true" />
      )}
    </div>
  )
}
