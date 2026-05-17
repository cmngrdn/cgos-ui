import type { CSSProperties, ReactNode } from 'react'
import { Spinner } from './Spinner'

/**
 * PulseSummaryCard — drilldown card showing a compact analytics summary.
 *
 * Lives inside an entity inspector's Details tab as a doorway into Pulse's
 * deeper view of that entity. Per the inspector redesign spec
 * (cmngrdn/docs/inspector-toggle-redesign.md §4.1): "2-3 key metrics + tiny
 * sparkline + delta vs prior period + 'View in Pulse →' affordance."
 *
 * Pure presentational. Caller pre-resolves the data — usually via a Phase 4
 * cmngrdn hook that calls the cgos SDK + supplies workspace context — and
 * passes it down as props. The drilldown push is wired by the caller's
 * `onOpen` handler (typically `inspector.pushInspector({ tabs: [...
 * <EntityPulseView /> ...] })`).
 *
 * Loading / empty states surface via `loading` + `empty` props rather than
 * a separate component, so the card's chrome doesn't flash in/out as data
 * resolves.
 *
 * Visual treatment composes `.cg-card-interactive` (utility class from
 * `cgos-ui/base.css`) — hover lift, press snap, focus-visible accent ring.
 * Renders as a `<button>` element when `onOpen` is set so keyboard
 * activation works without extra wiring.
 */

export type PulseDeltaTone = 'up' | 'down' | 'flat'

export interface PulseMetric {
  /** Short label — "Views" / "Captures" / "Conversion". */
  label: string
  /** Pre-formatted value — caller decides the format ("1,234" vs "1.2k",
   *  "6.3%" vs "6%"). Atom doesn't number-format. */
  value: ReactNode
  /** Optional delta vs prior period. `value` is the pre-formatted delta
   *  string ("+25%"); `tone` colors the chip (up=success, down=danger,
   *  flat=muted). */
  delta?: { value: string; tone?: PulseDeltaTone }
}

export interface PulseEmptyState {
  title: string
  hint?: string
}

export interface PulseSummaryCardProps {
  /** Header title. Defaults to "Pulse". */
  title?: string
  /** Optional eyebrow strip above the title — short context line
   *  (entity name, period). Tracked-uppercase styling applied. */
  eyebrow?: string
  /** 1-3 metrics. Atom renders up to 3 (overflow truncated). */
  metrics: PulseMetric[]
  /** Optional 14-day (or any length) trend values. Renders a thin bar
   *  sparkline at the bottom of the metrics row. Caller normalizes — atom
   *  just scales heights against the local max. */
  sparkline?: number[]
  /** Show loading state instead of metrics. */
  loading?: boolean
  /** Show empty state instead of metrics. Wins over `loading`. */
  empty?: PulseEmptyState
  /** Click handler. When set, the card becomes interactive (cursor /
   *  hover lift / focus ring / "View in Pulse →" affordance). */
  onOpen?: () => void
  /** Override the affordance label. Defaults to "View in Pulse →". */
  openLabel?: string
  /** Optional `aria-label` override for the interactive surface. */
  ariaLabel?: string
  /** Extra styles (margin, etc.) — DO NOT use to override card chrome. */
  style?: CSSProperties
  /** Extra className appended after `.cg-card-interactive`. */
  className?: string
}

const DELTA_COLOR: Record<PulseDeltaTone, string> = {
  up: 'var(--cg-status-success)',
  down: 'var(--cg-status-danger)',
  flat: 'var(--cg-text-muted)',
}

const DELTA_GLYPH: Record<PulseDeltaTone, string> = {
  up: '↑',
  down: '↓',
  flat: '·',
}

const CARD_BASE_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--cg-space-md)',
  padding: 'var(--cg-space-md)',
  width: '100%',
  textAlign: 'left',
}

const BUTTON_RESETS: CSSProperties = {
  appearance: 'none',
  font: 'inherit',
  color: 'inherit',
  border: undefined,
}

export function PulseSummaryCard({
  title = 'Pulse',
  eyebrow,
  metrics,
  sparkline,
  loading = false,
  empty,
  onOpen,
  openLabel = 'View in Pulse →',
  ariaLabel,
  style,
  className,
}: PulseSummaryCardProps) {
  const interactive = Boolean(onOpen)
  const composedClass = [
    interactive ? 'cg-card-interactive' : 'cg-card',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      <Header eyebrow={eyebrow} title={title} />
      <Body loading={loading} empty={empty} metrics={metrics} sparkline={sparkline} />
      {interactive && <Affordance label={openLabel} />}
    </>
  )

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel}
        className={composedClass}
        style={{ ...BUTTON_RESETS, ...CARD_BASE_STYLE, ...style }}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className={composedClass} style={{ ...CARD_BASE_STYLE, ...style }}>
      {inner}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────

function Header({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {eyebrow && (
        <span
          className="cg-text-micro"
          style={{ color: 'var(--cg-text-muted)' }}
        >
          {eyebrow}
        </span>
      )}
      <span
        className="cg-text-headline"
        style={{ color: 'var(--cg-text)' }}
      >
        {title}
      </span>
    </div>
  )
}

function Body({
  loading,
  empty,
  metrics,
  sparkline,
}: {
  loading: boolean
  empty?: PulseEmptyState
  metrics: PulseMetric[]
  sparkline?: number[]
}) {
  if (empty) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 4,
          padding: 'var(--cg-space-sm) 0',
        }}
      >
        <span className="cg-text-callout" style={{ color: 'var(--cg-text-secondary)' }}>
          {empty.title}
        </span>
        {empty.hint && (
          <span className="cg-text-small" style={{ color: 'var(--cg-text-muted)' }}>
            {empty.hint}
          </span>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--cg-space-sm)',
          padding: 'var(--cg-space-sm) 0',
          color: 'var(--cg-text-muted)',
        }}
      >
        <Spinner size="sm" />
        <span className="cg-text-small">Loading metrics…</span>
      </div>
    )
  }

  const shown = metrics.slice(0, 3)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(shown.length, 1)}, minmax(0, 1fr))`,
        gap: 'var(--cg-space-md)',
      }}
    >
      {shown.map((m) => (
        <MetricCell key={m.label} metric={m} />
      ))}
      {sparkline && sparkline.length > 0 && (
        <div style={{ gridColumn: '1 / -1' }}>
          <Sparkline values={sparkline} />
        </div>
      )}
    </div>
  )
}

function MetricCell({ metric }: { metric: PulseMetric }) {
  const tone = metric.delta?.tone ?? 'flat'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span
        className="cg-text-label"
        style={{
          color: 'var(--cg-text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {metric.label}
      </span>
      <span
        style={{
          fontFamily: 'var(--cg-font)',
          fontSize: 22,
          fontWeight: 600,
          color: 'var(--cg-text)',
          lineHeight: 1.1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {metric.value}
      </span>
      {metric.delta && (
        <span
          className="cg-text-caption"
          style={{
            color: DELTA_COLOR[tone],
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <span aria-hidden>{DELTA_GLYPH[tone]}</span>
          {metric.delta.value}
        </span>
      )}
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 2,
        height: 32,
        marginTop: 'var(--cg-space-xs)',
      }}
    >
      {values.map((v, i) => {
        const empty = v <= 0
        const pct = empty ? 0 : Math.max((v / max) * 100, 8)
        return (
          <div
            key={i}
            style={{
              flex: '1 1 0%',
              height: empty ? 2 : `${pct}%`,
              minHeight: 2,
              background: empty
                ? 'color-mix(in srgb, var(--cg-text-muted) 25%, transparent)'
                : 'var(--cg-accent)',
              opacity: empty ? 0.5 : 0.8,
              borderRadius: 1,
            }}
          />
        )
      })}
    </div>
  )
}

function Affordance({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: 'auto',
      }}
    >
      <span
        className="cg-text-label"
        style={{ color: 'var(--cg-accent)' }}
      >
        {label}
      </span>
    </div>
  )
}
