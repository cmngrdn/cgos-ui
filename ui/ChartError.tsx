import { type CSSProperties } from 'react'

/**
 * ChartError — compact inline error state for an analytics panel.
 *
 * One Pulse chart can fail without taking the page down — this renders a
 * centered danger-tinted message (+ optional Retry) inside the failed
 * panel's footprint. Promotes the copy-pasted `ErrorState` from cmngrdn's
 * analytics Bodies into one shared atom.
 *
 * Self-contained: the Retry control is a minimal inline button so the atom
 * carries no CSS dependency (no companion stylesheet to import). Pure
 * inline-style + `.cg-text-*` typography from base.css. Tokens only.
 */

export type ChartErrorSize = 'sm' | 'md'

export interface ChartErrorProps {
  /** The error message. Defaults to a generic line. */
  message?: string
  /** When set, renders a Retry button that calls this. */
  onRetry?: () => void
  size?: ChartErrorSize
  style?: CSSProperties
}

export function ChartError({
  message = 'Couldn’t load this data.',
  onRetry,
  size = 'md',
  style,
}: ChartErrorProps) {
  const padY = size === 'sm' ? 'var(--cg-space-lg)' : 'var(--cg-space-2xl)'
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 'var(--cg-space-sm)',
        padding: `${padY} var(--cg-space-lg)`,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'color-mix(in srgb, var(--cg-status-danger) 14%, transparent)',
          color: 'var(--cg-status-danger)',
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        !
      </span>
      <span className="cg-text-small" style={{ color: 'var(--cg-text-secondary)', maxWidth: 320 }}>
        {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="cg-text-small"
          style={{
            all: 'unset',
            cursor: 'pointer',
            color: 'var(--cg-accent)',
            fontWeight: 'var(--cg-weight-medium)',
            padding: '2px 4px',
            borderRadius: 'var(--cg-radius-sm)',
            outline: 'revert',
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
