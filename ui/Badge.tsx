import type { ReactNode, CSSProperties } from 'react'

/**
 * Badge — the canonical status-pill / chip atom for the Common Garden ecosystem.
 *
 * Replaces every ad-hoc inline status pill (save state, portal status, billing,
 * workspace state, etc.). Tones map to semantic `--cg-status-*` tokens — never
 * inline hex. Add new tones by adding a `--cg-status-*` token, not by extending
 * per-site palettes.
 *
 * Pure inline-style atom with no companion CSS — badges are display-only and
 * don't carry hover/active/focus states. Follows the Spinner precedent.
 *
 * Variants:
 *  - subtle (default) — tinted bg + token fg, softest read
 *  - outline          — transparent bg, 1px token border, token fg
 *  - solid            — token bg, contrast fg
 *
 * Sizes: sm (18px, micro label) / md (22px, default).
 *
 * `color` override (CSS var or color string) bypasses `tone` for data-driven
 * dynamic colors (e.g. per-row card chips). Use sparingly — the tone vocabulary
 * is the single source of truth.
 */

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'archived'

export type BadgeVariant = 'subtle' | 'outline' | 'solid'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  /** Raw color override (CSS var or color string). Bypasses `tone`. Use only
   * for per-row dynamic colors (e.g. data-driven card chips). */
  color?: string
  variant?: BadgeVariant
  size?: BadgeSize
  uppercase?: boolean
  dot?: boolean
  style?: CSSProperties
}

const TONE_VAR: Record<BadgeTone, string> = {
  neutral: 'var(--cg-text-secondary)',
  accent: 'var(--cg-accent)',
  success: 'var(--cg-status-success)',
  warning: 'var(--cg-status-warning)',
  danger: 'var(--cg-status-danger)',
  info: 'var(--cg-status-blue)',
  purple: 'var(--cg-status-purple)',
  archived: 'var(--cg-status-archived)',
}

const SOLID_FG: Record<BadgeTone, string> = {
  neutral: 'var(--cg-bg)',
  accent: 'var(--cg-bg)',
  success: 'var(--cg-bg)',
  warning: 'var(--cg-bg)',
  danger: '#fff',
  info: '#fff',
  purple: '#fff',
  archived: '#fff',
}

export function Badge({
  children,
  tone = 'neutral',
  color: colorOverride,
  variant = 'subtle',
  size = 'md',
  uppercase = false,
  dot = false,
  style,
}: BadgeProps) {
  const color = colorOverride ?? TONE_VAR[tone]
  const height = size === 'sm' ? 18 : 22
  const padX = size === 'sm' ? 6 : 8
  const fontSize = size === 'sm' ? '0.625rem' : '0.6875rem'

  let bg = 'transparent'
  let fg = color
  let border = '1px solid transparent'

  if (variant === 'subtle') {
    bg = `color-mix(in srgb, ${color}, transparent 88%)`
    border = `1px solid color-mix(in srgb, ${color}, transparent 70%)`
  } else if (variant === 'outline') {
    border = `1px solid ${color}`
  } else if (variant === 'solid') {
    bg = color
    fg = SOLID_FG[tone]
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height,
        padding: `0 ${padX}px`,
        borderRadius: 'var(--cg-radius-full)',
        border,
        background: bg,
        color: fg,
        fontFamily: 'var(--cg-font)',
        fontSize,
        fontWeight: 600,
        letterSpacing: uppercase ? '0.06em' : undefined,
        textTransform: uppercase ? 'uppercase' : 'none',
        whiteSpace: 'nowrap',
        lineHeight: 1,
        ...style,
      }}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: variant === 'solid' ? fg : color,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  )
}
