import { type CSSProperties } from 'react'
import { Skeleton } from './Skeleton'

/**
 * SkeletonText — a multi-line text-block loading placeholder built on the
 * `Skeleton` atom. Stacks `lines` shimmer bars with a shortened last line
 * so the block reads as a paragraph silhouette rather than a solid slab.
 *
 * Formalizes the "stack several with varied widths" hint on `Skeleton`
 * into one preset so every loading paragraph across HQ + public matches.
 * Pure presentational, no `'use client'` — renders in server components.
 *
 * Match the real content: use ~`lines` for the paragraph you're standing
 * in for, and set `width` to the text column so layout doesn't jump on load.
 */

export interface SkeletonTextProps {
  /** Number of lines. Default 3. */
  lines?: number
  /** Height of each line. number → px, or any CSS length. Default 12. */
  lineHeight?: number | string
  /** Vertical gap between lines. number → px, or any CSS length. Default 8. */
  gap?: number | string
  /** Width of the block (the full lines). Default '100%'. */
  width?: number | string
  /**
   * Width of the LAST line — a paragraph rarely fills its final row.
   * Default '60%'. Pass '100%' for a squared-off block (e.g. code).
   */
  lastLineWidth?: number | string
  /** ARIA label for the whole block. Default "Loading". */
  label?: string
  style?: CSSProperties
}

export function SkeletonText({
  lines = 3,
  lineHeight = 12,
  gap = 8,
  width = '100%',
  lastLineWidth = '60%',
  label = 'Loading',
  style,
}: SkeletonTextProps) {
  const count = Math.max(1, Math.floor(lines))
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      style={{ display: 'flex', flexDirection: 'column', gap, width, ...style }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === count - 1 && count > 1 ? lastLineWidth : '100%'}
          // The block owns the a11y role; the individual bars are decorative.
          label=""
        />
      ))}
    </div>
  )
}
