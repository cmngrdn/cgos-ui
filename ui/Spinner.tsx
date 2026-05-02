import { type CSSProperties } from 'react'

/**
 * Spinner — circular loading indicator atom.
 *
 * Pure inline-style; no companion CSS. References the `cg-spin` keyframe
 * shipped in `cgos-ui/base.css` (auto-loaded via `cgos-ui/index.css`).
 *
 * Sizes: sm (12px) / md (16px, default) / lg (24px) / xl (36px).
 * Default tint is `var(--cg-accent)`; override via the `color` prop with
 * any CSS color or var.
 */

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl'

export interface SpinnerProps {
  size?: SpinnerSize
  color?: string
  /** ARIA label for screen readers. Defaults to "Loading". */
  label?: string
  style?: CSSProperties
}

const PX: Record<SpinnerSize, number> = { sm: 12, md: 16, lg: 24, xl: 36 }
const BORDER: Record<SpinnerSize, number> = { sm: 1.5, md: 2, lg: 2.5, xl: 3 }

export function Spinner({
  size = 'md',
  color = 'var(--cg-accent)',
  label = 'Loading',
  style,
}: SpinnerProps) {
  const px = PX[size]
  const bw = BORDER[size]
  return (
    <span
      role="status"
      aria-label={label}
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        border: `${bw}px solid var(--cg-border)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'cg-spin 0.6s linear infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
