import { forwardRef, type CSSProperties, type Ref } from 'react'

/**
 * Toggle — the canonical switch atom for the Common Garden ecosystem.
 *
 * Replaces every ad-hoc inline `<button>` toggle. Two sizes:
 *  - md (default): 32×18 track, 14×14 dot — standard form/setting toggle
 *  - sm:           26×14 track, 10×10 dot — density-constrained rows
 *
 * Optional `label` renders the toggle as a clickable row with text on the
 * right. Without `label`, pass `ariaLabel` so the switch is announced
 * to assistive tech.
 *
 * `tone` controls the "on" color. Default `accent` matches the bulk of
 * settings toggles. Use `success` for affirmative-action toggles where
 * green semantically reads as "this is sending / publishing / actively
 * doing" (e.g. client confirmation email enabled).
 *
 * Companion CSS at `cgos-ui/ui/Toggle.css` carries the focus-visible ring
 * (auto-loaded via `cgos-ui/index.css`).
 */

export type ToggleTone = 'accent' | 'success' | 'warning' | 'danger'
export type ToggleSize = 'sm' | 'md'

export interface ToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label?: string
  ariaLabel?: string
  size?: ToggleSize
  tone?: ToggleTone
  style?: CSSProperties
  className?: string
}

const SPECS = {
  sm: { w: 26, h: 14, r: 7, dot: 10, on: 14, off: 2 },
  md: { w: 32, h: 18, r: 9, dot: 14, on: 16, off: 2 },
} as const

const TONE_VARS: Record<ToggleTone, string> = {
  accent: 'var(--cg-accent)',
  success: 'var(--cg-status-success)',
  warning: 'var(--cg-status-warning)',
  danger: 'var(--cg-status-danger)',
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked, onChange, disabled, label, ariaLabel, size = 'md', tone = 'accent', style, className },
  ref,
) {
  const t = SPECS[size]
  const onColor = TONE_VARS[tone]
  const handleClick = () => {
    if (disabled) return
    onChange(!checked)
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      data-cg-toggle=""
      data-size={size}
      data-tone={tone}
      {...(checked ? { 'data-checked': '' } : {})}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      <span
        data-cg-toggle-track=""
        style={{
          display: 'inline-block',
          position: 'relative',
          width: t.w,
          height: t.h,
          borderRadius: t.r,
          background: checked ? onColor : 'var(--cg-bg-surface)',
          boxShadow: checked ? 'none' : 'inset 0 0 0 1px var(--cg-border-hover)',
          transition: 'background 150ms ease',
          flexShrink: 0,
        }}
      >
        <span
          data-cg-toggle-dot=""
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? t.on : t.off,
            width: t.dot,
            height: t.dot,
            borderRadius: '50%',
            background: 'white',
            transition: 'left 150ms ease',
          }}
        />
      </span>
      {label && (
        <span data-cg-toggle-label="" style={{ fontSize: 12, color: 'var(--cg-text-secondary)' }}>
          {label}
        </span>
      )}
    </button>
  )
})
