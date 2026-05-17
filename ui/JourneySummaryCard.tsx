import type { CSSProperties, ReactNode } from 'react'
import { Spinner } from './Spinner'

/**
 * JourneySummaryCard — drilldown card showing a compact chronological feed.
 *
 * Lives inside an entity inspector's Details tab as a doorway into Journey's
 * full timeline for that entity. Per the inspector redesign spec
 * (cmngrdn/docs/inspector-toggle-redesign.md §4.1): "top 3-5 most-recent
 * events as compact rows + 'View full timeline →' affordance."
 *
 * Pure presentational. Caller pre-resolves the events — usually via a Phase 4
 * cmngrdn hook that calls the cgos SDK + supplies workspace context — and
 * passes them down as props. The drilldown push is wired by the caller's
 * `onOpen` handler (typically `inspector.pushInspector({ tabs: [...
 * <EntityJourneyView /> ...] })`).
 *
 * The atom is voice-agnostic. Caller decides whether labels read operator-
 * voice ("Inquiry submitted") or member-voice ("You submitted an inquiry").
 * Mirrors cmngrdn's `<ActivityCard>` convention.
 *
 * Visual: composes `.cg-card-interactive` (utility class from
 * `cgos-ui/base.css`). Renders as a `<button>` when `onOpen` is set.
 */

export interface JourneyEventPreview {
  /** Stable key for React. */
  id: string
  /** Inline glyph (emoji / symbol / SVG). Rendered inside a small tinted
   *  circle on the left of the row. Defaults to "·" when omitted. */
  icon?: ReactNode
  /** Color for the icon circle. CSS var or color string. Defaults to
   *  `var(--cg-text-secondary)`. */
  iconColor?: string
  /** Primary event text. Caller resolves voice. */
  label: ReactNode
  /** Optional secondary text on the same row, below the label. */
  meta?: ReactNode
  /** Pre-formatted timestamp ("5m ago", "2026-05-15", etc.). Caller owns
   *  the format so feeds inside an inspector stay aligned with their parent
   *  module page's format. */
  timestamp: string
}

export interface JourneyEmptyState {
  title: string
  hint?: string
}

export interface JourneySummaryCardProps {
  /** Header title. Defaults to "Journey". */
  title?: string
  /** Optional eyebrow strip above the title. */
  eyebrow?: string
  /** Optional sub-meta line under the title — "47 events · last 30 days". */
  subtitle?: string
  /** Events to render. Caller decides how many — atom shows everything
   *  passed (typical: 3-5). */
  events: JourneyEventPreview[]
  /** Show loading state instead of events. */
  loading?: boolean
  /** Show empty state instead of events. Wins over `loading`. */
  empty?: JourneyEmptyState
  /** Click handler. When set, the entire card is interactive. */
  onOpen?: () => void
  /** Override the affordance label. Defaults to "View full timeline →". */
  openLabel?: string
  /** Optional `aria-label` override. */
  ariaLabel?: string
  /** Extra inline style. */
  style?: CSSProperties
  /** Extra className appended after `.cg-card-interactive`. */
  className?: string
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

export function JourneySummaryCard({
  title = 'Journey',
  eyebrow,
  subtitle,
  events,
  loading = false,
  empty,
  onOpen,
  openLabel = 'View full timeline →',
  ariaLabel,
  style,
  className,
}: JourneySummaryCardProps) {
  const interactive = Boolean(onOpen)
  const composedClass = [
    interactive ? 'cg-card-interactive' : 'cg-card',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      <Header eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <Body loading={loading} empty={empty} events={events} />
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

function Header({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {eyebrow && (
        <span className="cg-text-micro" style={{ color: 'var(--cg-text-muted)' }}>
          {eyebrow}
        </span>
      )}
      <span className="cg-text-headline" style={{ color: 'var(--cg-text)' }}>
        {title}
      </span>
      {subtitle && (
        <span className="cg-text-caption" style={{ color: 'var(--cg-text-muted)' }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}

function Body({
  loading,
  empty,
  events,
}: {
  loading: boolean
  empty?: JourneyEmptyState
  events: JourneyEventPreview[]
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
        <span className="cg-text-small">Loading events…</span>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--cg-space-sm) 0',
          color: 'var(--cg-text-muted)',
        }}
      >
        <span className="cg-text-small">No events yet.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--cg-space-sm)' }}>
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </div>
  )
}

function EventRow({ event }: { event: JourneyEventPreview }) {
  const tint = event.iconColor ?? 'var(--cg-text-secondary)'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--cg-space-sm)',
        minWidth: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: `color-mix(in srgb, ${tint} 12%, transparent)`,
          color: tint,
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {event.icon ?? '·'}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--cg-space-sm)',
            minWidth: 0,
          }}
        >
          <span
            className="cg-text-small"
            style={{
              color: 'var(--cg-text)',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.label}
          </span>
          <span
            className="cg-text-caption"
            style={{
              color: 'var(--cg-text-muted)',
              flexShrink: 0,
              fontFamily: 'var(--cg-font-mono)',
            }}
          >
            {event.timestamp}
          </span>
        </div>
        {event.meta && (
          <span
            className="cg-text-caption"
            style={{
              color: 'var(--cg-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.meta}
          </span>
        )}
      </div>
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
      <span className="cg-text-label" style={{ color: 'var(--cg-accent)' }}>
        {label}
      </span>
    </div>
  )
}
