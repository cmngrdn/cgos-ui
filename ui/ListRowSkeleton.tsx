import { type CSSProperties } from 'react'
import { Skeleton } from './Skeleton'

/**
 * ListRowSkeleton — loading placeholder shaped to the `UniversalListRow`
 * contract (cmngrdn `@/components/hq/list`), so a list's loading state has
 * the SAME silhouette as its loaded rows and nothing shifts on hydration.
 *
 * Mirrors the row grammar exactly: `3px 40px 1fr auto` grid, 12px gap,
 * 64px row height, `0 16px 0 0` padding — a dim status spine, a 40px thumb
 * placeholder, a name + sub-meta text stack, and (optionally) a right-anchored
 * meta bar. Renders `rows` of them. Pure presentational, no `'use client'`.
 *
 * When the real rows are 72px mobile / grouped, that variance lives in the
 * consumer's list layout; this preset stands in for the common 64px desktop
 * row. Match `rows` to the page's typical first-load count.
 */

export interface ListRowSkeletonProps {
  /** Number of placeholder rows. Default 6. */
  rows?: number
  /** Thumb shape. `square` (default, 40px rounded), `circle` (avatar), `none`. */
  thumb?: 'square' | 'circle' | 'none'
  /** Show a right-anchored meta placeholder (time / progress column). Default true. */
  meta?: boolean
  /** ARIA label for the list. Default "Loading list". */
  label?: string
  style?: CSSProperties
}

const ROW_HEIGHT = 64

export function ListRowSkeleton({
  rows = 6,
  thumb = 'square',
  meta = true,
  label = 'Loading list',
  style,
}: ListRowSkeletonProps) {
  const count = Math.max(1, Math.floor(rows))
  return (
    <div role="status" aria-label={label} aria-busy="true" style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '3px 40px 1fr auto',
            alignItems: 'center',
            gap: 12,
            height: ROW_HEIGHT,
            padding: '0 16px 0 0',
            borderBottom: '1px solid var(--cg-border)',
          }}
        >
          {/* status spine — dim, non-shimmering hairline column */}
          <span
            aria-hidden="true"
            style={{
              width: 3,
              height: '100%',
              background: 'var(--cg-border)',
            }}
          />
          {/* thumb */}
          {thumb === 'none' ? (
            <span aria-hidden="true" style={{ width: 40 }} />
          ) : (
            <Skeleton
              width={40}
              height={40}
              circle={thumb === 'circle'}
              radius={thumb === 'square' ? 'var(--cg-radius-sm)' : undefined}
              label=""
            />
          )}
          {/* name + sub-meta stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
            <Skeleton width="52%" height={13} label="" />
            <Skeleton width="34%" height={11} label="" />
          </div>
          {/* right-anchored meta */}
          {meta ? <Skeleton width={48} height={11} label="" /> : <span />}
        </div>
      ))}
    </div>
  )
}
