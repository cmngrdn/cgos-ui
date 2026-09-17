/**
 * Where a dropdown menu goes, relative to the control that opened it.
 *
 * Below the trigger by default. ABOVE it when the room below is short and the
 * room above is larger — the case that mattered was a phone, where a filter
 * or audience picker near the bottom of the screen opened a menu that ran off
 * the viewport, under the keyboard or the bottom bar, with its first rows the
 * only ones reachable (phone-layout audit, 2026-09-17). Clamped horizontally so
 * a menu wider than the space to the right of its trigger stays on screen.
 *
 * Pure: the caller measures (`getBoundingClientRect`) and passes the viewport
 * size, so this is testable and knows nothing about React. The result is
 * shaped to spread straight into a `position: fixed` style — exactly one of
 * `top` / `bottom` is set.
 */

export interface MenuPlacement {
  top?: number
  bottom?: number
  left: number
  minWidth: number
  maxHeight: number
}

export interface MenuPlacementInput {
  /** The trigger's rect, viewport coordinates. */
  anchor: { top: number; bottom: number; left: number; width: number }
  viewport: { width: number; height: number }
  /** Narrowest the menu may be; it is never narrower than the trigger. */
  minWidth: number
  /** The height the menu wants when there is room for it. */
  preferredHeight: number
  /** Gap between trigger and menu. */
  gap?: number
  /** Distance kept from every viewport edge. */
  margin?: number
}

/** Below this much room, opening downward is not worth it if above is bigger. */
const MIN_USEFUL_HEIGHT = 240

export function placeMenu({
  anchor,
  viewport,
  minWidth,
  preferredHeight,
  gap = 4,
  margin = 8,
}: MenuPlacementInput): MenuPlacement {
  const width = Math.max(minWidth, anchor.width)
  const left = Math.max(
    margin,
    Math.min(anchor.left, viewport.width - width - margin),
  )
  const below = viewport.height - anchor.bottom - gap - margin
  const above = anchor.top - gap - margin
  const wanted = Math.min(preferredHeight, MIN_USEFUL_HEIGHT)

  if (below < wanted && above > below) {
    return {
      bottom: viewport.height - anchor.top + gap,
      left,
      minWidth: width,
      maxHeight: Math.max(0, Math.min(preferredHeight, above)),
    }
  }
  return {
    top: anchor.bottom + gap,
    left,
    minWidth: width,
    maxHeight: Math.max(0, Math.min(preferredHeight, below)),
  }
}

/** Measure a trigger and place its menu against the live viewport. */
export function placeMenuFor(
  el: Element,
  minWidth: number,
  preferredHeight: number,
): MenuPlacement {
  const r = el.getBoundingClientRect()
  return placeMenu({
    anchor: r,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    minWidth,
    preferredHeight,
  })
}

/** Moved to `lib/pointer` (v0.60.0); re-exported so existing imports keep working. */
export { isCoarsePointer } from './pointer'
