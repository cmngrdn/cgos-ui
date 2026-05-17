import type { CSSProperties, ReactNode } from 'react'
import { Spinner } from './Spinner'

/**
 * LinkedEntityCard — drilldown card for navigating to a related entity.
 *
 * Lives inside an entity inspector's Details tab as a doorway to a different
 * entity's canonical inspector. Per the inspector redesign spec
 * (cmngrdn/docs/inspector-toggle-redesign.md §4.1): "identity strip (avatar /
 * name / role) + key relationship metadata + '→' affordance."
 *
 * Pure presentational — caller passes the resolved identity strip + metadata,
 * the click handler (typically `inspector.pushInspector({ ... canonical
 * inspector body ... })`).
 *
 * `kind` is the type of the linked entity ("Contact", "Appointment",
 * "Inquiry"), rendered as the eyebrow. The atom doesn't lookup any "kind ↔
 * canonical inspector" mapping; that's the caller's concern.
 *
 * Visual: composes `.cg-card-interactive`. Renders as `<button>` when
 * `onOpen` is set.
 */

export interface LinkedAvatar {
  /** Image URL. When set, renders as a 32×32 tile (square if the avatar
   *  represents a workspace sigil; round when it represents a person —
   *  caller decides via `shape`). */
  src?: string | null
  /** Initials fallback when `src` is missing or fails. */
  initials?: string
  /** Tint color for initials background. Defaults to `var(--cg-text-muted)`. */
  color?: string
  /** Visual shape. Defaults to `round` (person/contact pattern). */
  shape?: 'round' | 'square'
}

export interface LinkedEmptyState {
  title: string
  hint?: string
}

export interface LinkedEntityCardProps {
  /** Eyebrow label — the kind of entity ("Contact" / "Appointment" /
   *  "Inquiry" / "Workspace"). Tracked uppercase. Required for vocabulary
   *  consistency. */
  kind: string
  /** Primary entity name. */
  title: ReactNode
  /** Optional secondary text under the title — relationship metadata
   *  ("Booked Mar 5", "saddlies · tattoo client", "RQ-2-K9X3MZ"). */
  meta?: ReactNode
  /** Optional avatar / sigil strip. */
  avatar?: LinkedAvatar
  /** Optional status pill / badge — caller composes via `<Badge>`. */
  badge?: ReactNode
  /** Show loading state instead of the identity strip. */
  loading?: boolean
  /** Show empty state instead of the identity strip. Wins over `loading`. */
  empty?: LinkedEmptyState
  /** Click handler. When set, the entire card is interactive. */
  onOpen?: () => void
  /** Override the affordance label. Defaults to "→". */
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
  alignItems: 'center',
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

export function LinkedEntityCard({
  kind,
  title,
  meta,
  avatar,
  badge,
  loading = false,
  empty,
  onOpen,
  openLabel = '→',
  ariaLabel,
  style,
  className,
}: LinkedEntityCardProps) {
  const interactive = Boolean(onOpen)
  const composedClass = [
    interactive ? 'cg-card-interactive' : 'cg-card',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const inner = empty ? (
    <EmptyBody empty={empty} kind={kind} />
  ) : loading ? (
    <LoadingBody kind={kind} />
  ) : (
    <IdentityBody
      kind={kind}
      title={title}
      meta={meta}
      avatar={avatar}
      badge={badge}
    />
  )

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={ariaLabel ?? `Open ${kind}`}
        className={composedClass}
        style={{ ...BUTTON_RESETS, ...CARD_BASE_STYLE, ...style }}
      >
        {inner}
        <Affordance label={openLabel} />
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

function IdentityBody({
  kind,
  title,
  meta,
  avatar,
  badge,
}: {
  kind: string
  title: ReactNode
  meta?: ReactNode
  avatar?: LinkedAvatar
  badge?: ReactNode
}) {
  return (
    <>
      {avatar && <Avatar avatar={avatar} />}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="cg-text-micro" style={{ color: 'var(--cg-text-muted)' }}>
          {kind}
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--cg-space-sm)',
            minWidth: 0,
          }}
        >
          <span
            className="cg-text-headline"
            style={{
              color: 'var(--cg-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {title}
          </span>
          {badge && <span style={{ flexShrink: 0 }}>{badge}</span>}
        </div>
        {meta && (
          <span
            className="cg-text-caption"
            style={{
              color: 'var(--cg-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {meta}
          </span>
        )}
      </div>
    </>
  )
}

function Avatar({ avatar }: { avatar: LinkedAvatar }) {
  const shape = avatar.shape ?? 'round'
  const radius = shape === 'square' ? 'var(--cg-radius-sm)' : '50%'
  const tint = avatar.color ?? 'var(--cg-text-muted)'

  if (avatar.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 32px tile, Next Image overkill in a UI atom
      <img
        src={avatar.src}
        alt=""
        style={{
          width: 32,
          height: 32,
          borderRadius: radius,
          objectFit: 'cover',
          flexShrink: 0,
          background: 'var(--cg-bg-surface)',
        }}
      />
    )
  }

  return (
    <span
      aria-hidden
      style={{
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius,
        background: `color-mix(in srgb, ${tint} 14%, transparent)`,
        color: tint,
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {(avatar.initials ?? '·').slice(0, 2).toUpperCase()}
    </span>
  )
}

function LoadingBody({ kind }: { kind: string }) {
  return (
    <>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'color-mix(in srgb, var(--cg-text-muted) 14%, transparent)',
          flexShrink: 0,
        }}
        aria-hidden
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="cg-text-micro" style={{ color: 'var(--cg-text-muted)' }}>
          {kind}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--cg-space-sm)',
            color: 'var(--cg-text-muted)',
          }}
        >
          <Spinner size="sm" />
          <span className="cg-text-small">Loading…</span>
        </span>
      </div>
    </>
  )
}

function EmptyBody({
  empty,
  kind,
}: {
  empty: LinkedEmptyState
  kind: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span className="cg-text-micro" style={{ color: 'var(--cg-text-muted)' }}>
        {kind}
      </span>
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

function Affordance({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="cg-text-headline"
      style={{
        color: 'var(--cg-accent)',
        flexShrink: 0,
        marginLeft: 'auto',
        paddingLeft: 'var(--cg-space-sm)',
      }}
    >
      {label}
    </span>
  )
}
