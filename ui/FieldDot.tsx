import { type CSSProperties } from 'react'

/**
 * FieldDot — small "lit up" indicator next to form-field labels.
 *
 * Goes from neutral muted-grey (empty) to accent-colored with a soft glow
 * (filled) on a 200ms transition. The visual metaphor is the orb
 * brightening as fields fill in — empty stays calm rather than yelling
 * with a red validation dot.
 *
 * Use next to a field's `<label>` text to surface "this part of your
 * world isn't lit up yet" without shouting.
 *
 * Sizes: sm (5px) / md (6px, default) / lg (8px).
 */

export type FieldDotSize = 'sm' | 'md' | 'lg'

export interface FieldDotProps {
  /** When true, dot is accent-colored with a glow. When false, muted-grey. */
  lit: boolean
  size?: FieldDotSize
  /** Override accent color (CSS string or `--cg-*` var). Defaults to `--cg-accent`. */
  color?: string
  style?: CSSProperties
  /** ARIA label. Defaults to "filled" / "empty" based on `lit`. */
  label?: string
}

const PX: Record<FieldDotSize, number> = { sm: 5, md: 6, lg: 8 }

export function FieldDot({
  lit,
  size = 'md',
  color = 'var(--cg-accent)',
  style,
  label,
}: FieldDotProps) {
  const px = PX[size]
  const ariaLabel = label ?? (lit ? 'filled' : 'empty')
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        borderRadius: '50%',
        background: lit ? color : 'var(--cg-text-muted)',
        opacity: lit ? 1 : 0.45,
        boxShadow: lit
          ? `0 0 8px color-mix(in srgb, ${color} 65%, transparent)`
          : 'none',
        flexShrink: 0,
        transition: 'background 200ms var(--cg-ease), opacity 200ms var(--cg-ease), box-shadow 200ms var(--cg-ease)',
        ...style,
      }}
    />
  )
}
