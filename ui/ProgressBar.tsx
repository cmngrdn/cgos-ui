import type { CSSProperties } from 'react'

/**
 * ProgressBar — determinate / indeterminate horizontal loading bar atom.
 *
 * `value` is 0–100. Pass `indeterminate` (omit value) for a pulsing
 * "working" state — uses the shared `cg-progress-indeterminate` keyframe
 * shipped in `cgos-ui/base.css`.
 *
 * Tone picks semantic color — defaults to accent. `thickness` defaults
 * to 4px; bump for hero progress (e.g., import job).
 *
 * Pure inline-style atom — no companion CSS. Keyframe is shared, not
 * per-atom.
 */

export type ProgressBarTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

export interface ProgressBarProps {
  value?: number
  indeterminate?: boolean
  tone?: ProgressBarTone
  /** Bar thickness in px. Default 4. */
  thickness?: number
  label?: string
  style?: CSSProperties
}

const TONE_VAR: Record<ProgressBarTone, string> = {
  accent: 'var(--cg-accent)',
  success: 'var(--cg-status-success)',
  warning: 'var(--cg-status-warning)',
  danger: 'var(--cg-status-danger)',
  neutral: 'var(--cg-text-secondary)',
}

export function ProgressBar({
  value,
  indeterminate = false,
  tone = 'accent',
  thickness = 4,
  label,
  style,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value ?? 0))
  const fill = TONE_VAR[tone]

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={indeterminate ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        width: '100%',
        height: thickness,
        background: 'var(--cg-surface-raise)',
        borderRadius: thickness / 2,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          width: indeterminate ? '40%' : `${pct}%`,
          height: '100%',
          background: fill,
          borderRadius: thickness / 2,
          transition: indeterminate ? undefined : 'width var(--cg-duration-base) var(--cg-ease)',
          animation: indeterminate ? 'cg-progress-indeterminate 1.2s ease-in-out infinite' : undefined,
        }}
      />
    </div>
  )
}
