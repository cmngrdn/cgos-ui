import { type ReactNode, type CSSProperties } from 'react'

/**
 * StatTile — compact single-metric tile (big value + label + optional delta).
 *
 * The unit cell of a Pulse summary row (e.g. the Audience health strip:
 * total · email-reachable · sms-reachable · unreachable · new-this-week).
 * Generalizes cmngrdn's `OverviewBody` TileCard into a shared atom.
 *
 * Pass a PRE-FORMATTED `value` (the atom does no number formatting — the
 * caller owns locale/units). `delta` shows a change indicator; its `tone`
 * is explicit because "up" isn't always good (unreachable rising is bad) —
 * the caller decides up→success / down→danger / flat→neutral.
 *
 * `accent` colors the value (default `--cg-text`); pass the module accent
 * for a tinted metric. Set `onClick` to make the tile a filter control —
 * it renders as a `<button>` with hover + focus ring, and `selected` adds
 * the accent ring for the cross-filter "this cohort is active" state.
 *
 * Pure inline-style + `.cg-text-*` typography from base.css. Tokens only.
 */

export interface StatTileDelta {
  /** Pre-formatted, e.g. "+12%" or "+47". */
  value: string
  tone?: 'up' | 'down' | 'flat'
}

export interface StatTileProps {
  value: ReactNode
  label: string
  delta?: StatTileDelta
  /** Value color + selected ring. Default `--cg-text`. */
  accent?: string
  icon?: ReactNode
  /** When set, the tile is a clickable filter control. */
  onClick?: () => void
  /** Cross-filter active state (accent ring + subtle tint). */
  selected?: boolean
  style?: CSSProperties
}

const DELTA_COLOR: Record<NonNullable<StatTileDelta['tone']>, string> = {
  up: 'var(--cg-status-success)',
  down: 'var(--cg-status-danger)',
  flat: 'var(--cg-text-muted)',
}
const DELTA_GLYPH: Record<NonNullable<StatTileDelta['tone']>, string> = {
  up: '↑',
  down: '↓',
  flat: '·',
}

export function StatTile({
  value,
  label,
  delta,
  accent = 'var(--cg-text)',
  icon,
  onClick,
  selected = false,
  style,
}: StatTileProps) {
  const interactive = !!onClick
  const deltaTone = delta?.tone ?? 'flat'

  const baseStyle: CSSProperties = {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--cg-space-xs)',
    padding: 'var(--cg-space-md)',
    minWidth: 0,
    borderRadius: 'var(--cg-radius-lg)',
    border: `1px solid ${selected ? accent : 'var(--cg-border)'}`,
    background: selected
      ? 'color-mix(in srgb, var(--cg-bg-surface) 100%, transparent)'
      : 'var(--cg-bg-surface)',
    boxShadow: selected ? `inset 0 0 0 1px ${accent}` : undefined,
    textAlign: 'left',
    transition:
      'border-color 140ms var(--cg-ease), box-shadow 140ms var(--cg-ease), background 140ms var(--cg-ease)',
    ...style,
  }

  const inner = (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--cg-space-xs)',
          minWidth: 0,
        }}
      >
        {icon && (
          <span aria-hidden style={{ color: accent, display: 'inline-flex', flexShrink: 0 }}>
            {icon}
          </span>
        )}
        <span
          className="cg-text-title"
          style={{
            color: accent,
            fontWeight: 'var(--cg-weight-semibold)',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </span>
        {delta && (
          <span
            className="cg-text-caption"
            style={{ color: DELTA_COLOR[deltaTone], whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {DELTA_GLYPH[deltaTone]} {delta.value}
          </span>
        )}
      </div>
      <span className="cg-text-micro" style={{ color: 'var(--cg-text-secondary)' }}>
        {label}
      </span>
    </>
  )

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        style={{ ...baseStyle, cursor: 'pointer', font: 'inherit', outline: 'revert' }}
      >
        {inner}
      </button>
    )
  }
  return <div style={baseStyle}>{inner}</div>
}
