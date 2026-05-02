import type { ReactNode } from 'react'

/**
 * EmptyState — the "no items yet" placeholder atom every list needs.
 *
 * Compose with: optional icon (ReactNode, 32px nominal), required title,
 * optional description, optional action slot (typically a button).
 *
 * Sizes:
 *  - md (default) — full page / tab empty state
 *  - sm           — inline inside an inspector panel or card
 *
 * Pure inline-style atom — no companion CSS. Uses `.cg-text-*` typography
 * classes from `cgos-ui/base.css`.
 */

export type EmptyStateSize = 'sm' | 'md'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  size?: EmptyStateSize
}

export function EmptyState({ icon, title, description, action, size = 'md' }: EmptyStateProps) {
  const padY = size === 'sm' ? 'var(--cg-space-lg)' : 'var(--cg-space-2xl)'
  const iconSize = size === 'sm' ? 28 : 40

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: `${padY} var(--cg-space-lg)`,
        gap: 'var(--cg-space-sm)',
      }}
    >
      {icon && (
        <div
          aria-hidden
          style={{
            width: iconSize,
            height: iconSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cg-text-muted)',
            marginBottom: 'var(--cg-space-xs)',
          }}
        >
          {icon}
        </div>
      )}
      <div
        className={size === 'sm' ? 'cg-text-body' : 'cg-text-title'}
        style={{ color: 'var(--cg-text)' }}
      >
        {title}
      </div>
      {description && (
        <div className="cg-text-small" style={{ color: 'var(--cg-text-secondary)', maxWidth: 420 }}>
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: 'var(--cg-space-sm)' }}>{action}</div>}
    </div>
  )
}
