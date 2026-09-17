import { useSyncExternalStore } from 'react'

/**
 * Pointer — one definition of "is a finger driving this?" (v0.60.0).
 *
 * Keyed on `(pointer: coarse)`, never on viewport width. The two disagree in
 * the cases that matter: a narrow desktop window still has a mouse (so it keeps
 * "Click" copy and autofocus), and a tablet in landscape is wide but still
 * fingered (so it gets "Tap" and no surprise keyboard). It is the same query
 * the atoms' CSS uses for their 44px touch hit areas and the Composer's 16px
 * text, so a component that branches on it agrees with the stylesheet.
 *
 * Hoisted from cmngrdn `lib/hq/touch.ts`, which had grown a second copy of
 * `isCoarsePointer` under another name.
 */

const QUERY = '(pointer: coarse)'

/** True when a finger is the pointer. Synchronous: for event handlers and
 *  effects, never for render (the server has no pointer). */
export function isCoarsePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(QUERY).matches
  )
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * Render-safe read. The server snapshot is `false` (mouse copy), so a phone
 * renders "Click" for one frame and settles on "Tap" after hydration: a copy
 * flicker, never a hydration mismatch.
 */
export function useIsTouchPointer(): boolean {
  return useSyncExternalStore(subscribe, isCoarsePointer, () => false)
}

/** "Tap" on a finger, "Click" on a mouse, capitalised unless told not to. */
export function pressVerb(touch: boolean, capital = true): string {
  const verb = touch ? 'tap' : 'click'
  return capital ? verb[0].toUpperCase() + verb.slice(1) : verb
}
