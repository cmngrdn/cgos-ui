import { useEffect, useState } from 'react'

/**
 * usePresence — keep a component mounted through its exit animation.
 *
 * Overlays that unmount the instant `open` flips false hard-cut off screen:
 * the enter animation plays on open, but on close the node just vanishes.
 * This hook bridges that gap. Feed it the `open` boolean; it returns whether
 * the node should still be in the tree. While closing, it stays `true` for
 * `exitMs` so an exit animation can play, then flips `false` to unmount.
 *
 * Drive the enter vs. exit keyframes off the same `open` flag the caller
 * already has (open → enter, !open while still mounted → exit).
 *
 *   const mounted = usePresence(open, 160)
 *   if (!mounted) return null
 *   // ...style={{ animation: open ? enterKeyframe : exitKeyframe }}
 *
 * `exitMs` MUST match the exit animation duration so unmount lands as the
 * animation finishes — too short cuts it off, too long leaves a frozen
 * frame. Under `prefers-reduced-motion: reduce` the exit is instantaneous
 * (unmounts on the same tick), matching the design system's motion policy.
 */
export function usePresence(open: boolean, exitMs = 180): boolean {
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setMounted(false)
      return
    }
    const timer = window.setTimeout(() => setMounted(false), exitMs)
    return () => window.clearTimeout(timer)
  }, [open, exitMs])

  return mounted
}
