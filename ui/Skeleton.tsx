import { type CSSProperties } from 'react'

/**
 * Skeleton — shimmer placeholder atom for loading states.
 *
 * Pure inline-style; references the `cg-shimmer` keyframe shipped in
 * `cgos-ui/base.css` (auto-loaded via `cgos-ui/index.css`). Carries the
 * `cg-skeleton` class so the base-css `prefers-reduced-motion` guard can
 * neutralize the shimmer (the one case where a CSS `!important` rule
 * overrides the inline `animation` property).
 *
 * Pass `width`/`height` (number → px, or any CSS length). `circle` makes a
 * round avatar placeholder. `radius` overrides the corner rounding
 * (default `--cg-radius-sm`). For a multi-line text block, stack several
 * with varied widths.
 *
 * Use to match the silhouette of the content that's loading — a chart's
 * skeleton should be the chart's height so layout doesn't jump on load.
 */

export interface SkeletonProps {
  /** number → px, or any CSS length string. Default '100%'. */
  width?: number | string
  /** number → px, or any CSS length string. Default 16. */
  height?: number | string
  /** Corner radius. number → px, or any CSS length. Default --cg-radius-sm. */
  radius?: number | string
  /** Round placeholder (avatar). Overrides radius. */
  circle?: boolean
  /** ARIA label for screen readers. Defaults to "Loading". */
  label?: string
  style?: CSSProperties
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  circle = false,
  label = 'Loading',
  style,
}: SkeletonProps) {
  const resolvedRadius = circle
    ? '50%'
    : radius != null
      ? radius
      : 'var(--cg-radius-sm)'
  return (
    <span
      className="cg-skeleton"
      role="status"
      aria-label={label}
      aria-busy="true"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: resolvedRadius,
        // Moving-gradient shimmer. The base.css reduced-motion guard swaps
        // this for a static fill (animation: none !important).
        background:
          'linear-gradient(90deg, var(--cg-surface-raise) 25%, var(--cg-surface-raise-strong) 50%, var(--cg-surface-raise) 75%)',
        backgroundSize: '200% 100%',
        animation: 'cg-shimmer 1.4s ease-in-out infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
