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
 * Companion CSS at `cgos-ui/ui/Toggle.css` carries the WHOLE resting state
 * (v0.77.0) — track, dot, tones, sizes, focus ring, touch hit area — keyed off
 * `data-size` / `data-tone` / `data-checked`. It used to be inline, which is
 * how the off track came to be `--cg-bg-surface`: invisible on a dark theme,
 * so an off switch read as a lone white dot (AHLC → Modules, 2026-09-27) and
 * nothing outside the atom could correct it.
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

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked, onChange, disabled, label, ariaLabel, size = 'md', tone = 'accent', style, className },
  ref,
) {
  const handleClick = () => {
    if (disabled) return
    onChange(!checked)
  }

  // Resting state lives in Toggle.css (v0.77.0), keyed off these attributes,
  // so a consumer's stylesheet can reach it. `style` stays the per-instance
  // escape hatch and still wins.
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
      style={style}
    >
      <span data-cg-toggle-track="">
        <span data-cg-toggle-dot="" />
      </span>
      {label && <span data-cg-toggle-label="">{label}</span>}
    </button>
  )
})
