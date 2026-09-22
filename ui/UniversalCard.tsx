'use client'

/**
 * UniversalCard — the middle-density list-item primitive for `/hq/*`.
 *
 * Sits between UniversalListRow (64px, one line) and UniversalTile
 * (image-forward grid). Reuses the same status-spine + thumb vocabulary but
 * surfaces multiple dimensions at once: media + eyebrow + name + fact cluster
 * + one signal + footer. Each consumer adapter fills the slots it has.
 *
 * Spec: docs/list-row-template.md → "Card sibling"
 * Grammar (7 slots): spine · media · eyebrow · title · facts · signal · footer.
 *
 * Dependency-free (no Pulse import) — which is what let it hoist to cgos-ui
 * with the row and the tile (v0.71.0).
 */

import { useState } from 'react'
import { IconButton } from './IconButton'
import { SPINE_VAR } from '../lib/list'
import type { UniversalCardProps, CardMedia, CardSignal, RowAction } from '../lib/list'
import './UniversalCard.css'

export type {
  UniversalCardProps,
  CardMedia,
  CardFact,
  CardSignal,
  CardChip,
} from '../lib/list'

export function UniversalCard(props: UniversalCardProps) {
  const {
    spine,
    spineTooltip,
    selectionSlot,
    media,
    mediaTint,
    typeLabel,
    subLabel,
    timestamp,
    name,
    facts,
    signal,
    chips,
    primaryAction,
    secondaryAction,
    onClick,
    selected,
  } = props

  const hasMetrics =
    (facts && facts.length > 0) ||
    (signal && signal.kind !== 'none') ||
    (chips && chips.length > 0) ||
    !!primaryAction ||
    !!secondaryAction

  const handleKey = (e: React.KeyboardEvent) => {
    if (!onClick) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={onClick ? 0 : -1}
      className={`ucard${selected ? ' ucard-selected' : ''}`}
      onClick={onClick}
      onKeyDown={handleKey}
      data-spine={spine}
      title={spineTooltip}
      aria-pressed={selected || undefined}
    >
      <span className="ucard-spine" aria-hidden style={{ background: SPINE_VAR[spine] }} />

      {selectionSlot && (
        <span className="ucard-selection" onClick={(e) => e.stopPropagation()}>
          {selectionSlot}
        </span>
      )}

      <span
        className="ucard-media"
        aria-hidden
        style={media.kind === 'image' ? undefined : { background: mediaTint ?? 'var(--cg-bg-surface)' }}
      >
        <MediaContent media={media} />
      </span>

      <span className="ucard-main">
        <span className="ucard-eyebrow">
          <span className="ucard-eyebrow-type">{typeLabel}</span>
          {subLabel && (
            <>
              <span className="ucard-eyebrow-dot" aria-hidden />
              <span>{subLabel}</span>
            </>
          )}
          {timestamp && (
            <>
              <span className="ucard-eyebrow-dot" aria-hidden />
              <span>{timestamp}</span>
            </>
          )}
        </span>
        <span className="ucard-name">{name}</span>
      </span>

      {hasMetrics && (
        <span className="ucard-metrics">
          {facts?.map((f, i) => (
            <span className="ucard-fact" key={i}>
              <span className="ucard-fact-k">{f.label}</span>
              <span className="ucard-fact-v">{f.value}</span>
            </span>
          ))}

          {signal && signal.kind !== 'none' && (
            <span className="ucard-signal">
              <SignalContent signal={signal} />
            </span>
          )}

          {chips && chips.length > 0 && (
            <span className="ucard-chips">
              {chips.map((c, i) => (
                <span className="ucard-chip" data-tone={c.tone ?? 'default'} key={i}>
                  {c.label}
                </span>
              ))}
            </span>
          )}

          {(primaryAction || secondaryAction) && (
            <span className="ucard-actions" onClick={(e) => e.stopPropagation()}>
              {primaryAction && <CardActionButton action={primaryAction} />}
              {secondaryAction && <CardActionButton action={secondaryAction} />}
            </span>
          )}
        </span>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────

function MediaContent({ media }: { media: CardMedia }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (media.kind === 'date') {
    return (
      <span className="ucard-date">
        <span className="ucard-date-m">{media.month}</span>
        <span className="ucard-date-d">{media.day}</span>
        {media.time && <span className="ucard-date-t">{media.time}</span>}
      </span>
    )
  }
  if (media.kind === 'image' && !imgFailed) {
    return (
      <img
        src={media.url}
        alt={media.alt}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        className="ucard-media-img"
      />
    )
  }
  if (media.kind === 'image' && imgFailed) {
    return <span className="ucard-media-mark">✦</span>
  }
  if (media.kind === 'icon') {
    const Icon = media.Icon
    return (
      <span className="ucard-media-icon" style={{ color: media.tint ?? 'var(--cg-text-muted)' }}>
        <Icon size={22} weight="duotone" />
      </span>
    )
  }
  if (media.kind === 'mark') {
    return (
      <span className="ucard-media-mark" style={{ color: media.tint ?? 'var(--cg-text-muted)' }}>
        {media.char}
      </span>
    )
  }
  if (media.kind === 'swatch') {
    return <span className="ucard-media-swatch" style={{ background: media.color }} />
  }
  return null
}

// ──────────────────────────────────────────────────────────────────────────

function SignalContent({ signal }: { signal: CardSignal }) {
  if (signal.kind === 'progress') {
    const pct = signal.total > 0 ? Math.max(0, Math.min(1, signal.value / signal.total)) : 0
    const accent = signal.accent ?? 'var(--cg-accent)'
    return (
      <>
        <span className="ucard-sig-row">
          <span className="ucard-sig-lbl">{signal.label ?? 'Progress'}</span>
          <span className="ucard-sig-val" style={{ color: accent }}>
            {signal.valueLabel ?? `${signal.value} / ${signal.total}`}
          </span>
        </span>
        <span className="ucard-track">
          <span className="ucard-track-fill" style={{ width: `${pct * 100}%`, background: accent }} />
        </span>
      </>
    )
  }
  if (signal.kind === 'stat') {
    return (
      <span className="ucard-sig-row">
        <span className="ucard-sig-lbl">{signal.label}</span>
        <span className="ucard-sig-stat" style={{ color: signal.accent ?? 'var(--cg-text)' }}>
          {signal.value}
        </span>
      </span>
    )
  }
  if (signal.kind === 'pill') {
    const color = SPINE_VAR[signal.tone]
    return (
      <span
        className="ucard-pill"
        style={{
          color,
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
        }}
      >
        <span className="ucard-pill-dot" style={{ background: color }} />
        {signal.label}
      </span>
    )
  }
  if (signal.kind === 'sparkline') {
    return <Sparkline points={signal.points} label={signal.label} delta={signal.delta} accent={signal.accent} />
  }
  if (signal.kind === 'custom') {
    return (
      <>
        {signal.label && (
          <span className="ucard-sig-row">
            <span className="ucard-sig-lbl">{signal.label}</span>
          </span>
        )}
        {signal.node}
      </>
    )
  }
  return null
}

// Self-contained micro-sparkline — no Pulse dependency. For a full-fidelity
// chart (axes, tooltip, multi-series) a consumer passes a real Pulse primitive
// through the `custom` signal slot instead.
function Sparkline({
  points,
  label,
  delta,
  accent = 'var(--cg-accent)',
}: {
  points: number[]
  label?: string
  delta?: string
  accent?: string
}) {
  const W = 200
  const H = 30
  if (points.length < 2) {
    return (
      <span className="ucard-sig-row">
        <span className="ucard-sig-lbl">{label ?? 'Trend'}</span>
        <span className="ucard-sig-val ucard-sig-muted">—</span>
      </span>
    )
  }
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = W / (points.length - 1)
  const coords = points.map((p, i) => {
    const x = i * step
    const y = H - ((p - min) / span) * (H - 4) - 2
    return { x, y }
  })
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const end = coords[coords.length - 1]

  return (
    <>
      {(label || delta) && (
        <span className="ucard-sig-row">
          <span className="ucard-sig-lbl">{label ?? 'Trend'}</span>
          {delta && <span className="ucard-sig-val" style={{ color: accent }}>{delta}</span>}
        </span>
      )}
      <svg className="ucard-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <path d={area} fill={accent} opacity={0.14} />
        <path d={line} fill="none" stroke={accent} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <circle cx={end.x} cy={end.y} r={2.4} fill={accent} />
      </svg>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────────

function CardActionButton({ action }: { action: RowAction }) {
  const { Icon, label, href, onClick, active } = action
  const disabled = !href && !onClick

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer')
      return
    }
    onClick?.(e)
  }

  return (
    <IconButton
      label={label}
      title={label}
      size="sm"
      variant={active ? 'accent' : 'subtle'}
      active={active}
      disabled={disabled}
      onClick={handleClick}
      icon={<Icon size={12} weight="regular" />}
    />
  )
}
