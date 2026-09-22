'use client'

/**
 * UniversalListRow — the single list-row primitive for every `/hq/*` module.
 *
 * Spec: docs/list-row-template.md
 *
 * Grammar (left → right):
 *   1. 3px colored spine (status)
 *   2. Thumb (40px) + Name + Sub-meta
 *   3. Right anchor: progress dots OR timestamp OR channel coverage OR none,
 *      then up to 2 action buttons
 *
 * Row height: 64px desktop / 72px mobile. Locked.
 * No chips, no date column, no per-module CSS overrides.
 */

import { useState } from 'react'
import { IconButton } from './IconButton'
import { SPINE_VAR } from '../lib/list'
import type { UniversalListRowProps } from '../lib/list'
import { CompletenessDots } from './CompletenessDots'
import './UniversalListRow.css'

export type {
  UniversalListRowProps,
  SpineToken,
  ThumbSlot,
  RightAnchor,
  CoverageChannel,
  RowAction,
} from '../lib/list'
export { SPINE_VAR } from '../lib/list'

export function UniversalListRow(props: UniversalListRowProps) {
  const {
    spine,
    spineTooltip,
    selectionSlot,
    thumb,
    thumbCornerPortalDot,
    name,
    subMeta,
    rightAnchor,
    primaryAction,
    secondaryAction,
    onClick,
    selected,
    focused,
  } = props

  const [imgFailed, setImgFailed] = useState(false)

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
      className={`ulr-row${selected ? ' ulr-row-selected' : ''}${focused ? ' ulr-row-focused' : ''}`}
      onClick={onClick}
      onKeyDown={handleKey}
      data-spine={spine}
      title={spineTooltip}
      aria-pressed={selected || undefined}
    >
      <span
        className="ulr-spine"
        aria-hidden
        style={{ background: SPINE_VAR[spine] }}
      />

      {selectionSlot && (
        <span className="ulr-selection" onClick={(e) => e.stopPropagation()}>
          {selectionSlot}
        </span>
      )}

      <span className="ulr-thumb" aria-hidden>
        <ThumbContent thumb={thumb} imgFailed={imgFailed} onImgError={() => setImgFailed(true)} />
        {thumbCornerPortalDot && (
          <span
            className="ulr-portal-pip"
            data-tone={thumbCornerPortalDot.tone}
            aria-label="Portal page attached"
          />
        )}
      </span>

      <span className="ulr-body">
        <span className="ulr-name">{name}</span>
        {subMeta && <span className="ulr-sub-meta">{subMeta}</span>}
      </span>

      <span className="ulr-right" onClick={(e) => e.stopPropagation()}>
        <RightAnchorContent anchor={rightAnchor} />
        <RowActionButtons primary={primaryAction} secondary={secondaryAction} />
      </span>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────

function ThumbContent({
  thumb,
  imgFailed,
  onImgError,
}: {
  thumb: UniversalListRowProps['thumb']
  imgFailed: boolean
  onImgError: () => void
}) {
  if (thumb.kind === 'image' && !imgFailed) {
    return (
      <img
        src={thumb.url}
        alt={thumb.alt}
        loading="lazy"
        decoding="async"
        onError={onImgError}
        className="ulr-thumb-img"
      />
    )
  }
  if (thumb.kind === 'image' && imgFailed) {
    // Fallback to a generic glyph when an image url failed to load.
    return <span className="ulr-thumb-mark">✦</span>
  }
  if (thumb.kind === 'icon') {
    const Icon = thumb.Icon
    return (
      <span className="ulr-thumb-icon" style={{ color: thumb.tint ?? 'var(--cg-text-muted)' }}>
        <Icon size={20} weight="duotone" />
      </span>
    )
  }
  if (thumb.kind === 'mark') {
    return (
      <span className="ulr-thumb-mark" style={{ color: thumb.tint ?? 'var(--cg-text-muted)' }}>
        {thumb.char}
      </span>
    )
  }
  if (thumb.kind === 'swatch') {
    return <span className="ulr-thumb-swatch" style={{ background: thumb.color }} />
  }
  return null
}

// ──────────────────────────────────────────────────────────────────────────

function RightAnchorContent({ anchor }: { anchor: UniversalListRowProps['rightAnchor'] }) {
  if (anchor.kind === 'progress') {
    return (
      <span className="ulr-progress">
        <CompletenessDots
          score={anchor.value}
          total={anchor.total}
          accent={anchor.accent}
        />
      </span>
    )
  }
  if (anchor.kind === 'coverage') {
    const max = anchor.max ?? 4
    const shown = anchor.channels.slice(0, max)
    const extra = anchor.channels.length - shown.length
    if (anchor.channels.length === 0) {
      return <span className="ulr-coverage-empty">{anchor.emptyLabel ?? 'No channels'}</span>
    }
    return (
      <span className="ulr-coverage">
        {shown.map((c) => (
          <span
            key={c.key}
            className="ulr-coverage-glyph"
            data-published={c.published || undefined}
            title={c.label}
          >
            {c.glyph}
          </span>
        ))}
        {extra > 0 && <span className="ulr-coverage-more">+{extra}</span>}
      </span>
    )
  }
  if (anchor.kind === 'time') {
    // `relative` was declared on the type from the start but never
    // implemented, so every consumer that set it got a raw ISO string on the
    // row's right edge. Default stays verbatim: SmsInboxPage passes an
    // already-formatted label through `iso`, and formatting it again would
    // turn a working row into `Invalid Date`.
    const label = anchor.relative ? relativeTime(anchor.iso) : anchor.iso
    return (
      <span className="ulr-time" title={anchor.relative ? anchor.iso : undefined}>
        {label}
      </span>
    )
  }
  return null
}

/**
 * Coarse relative time for a row's right edge — "3h", "2d", then a date.
 *
 * Deliberately not a library: this is one line of text in a fixed-width slot,
 * and the exact instant is one hover away in the `title`. Falls back to the
 * input unchanged if it isn't a parseable date, so a caller passing a
 * pre-formatted label can't be turned into `Invalid Date`.
 */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return iso
  const mins = Math.floor((Date.now() - t) / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ──────────────────────────────────────────────────────────────────────────

function RowActionButtons({
  primary,
  secondary,
}: {
  primary?: UniversalListRowProps['primaryAction']
  secondary?: UniversalListRowProps['secondaryAction']
}) {
  // Only render the action cluster if at least one action SLOT is declared
  // (primary or secondary). Modules that don't speak this language render
  // nothing on the right edge.
  if (!primary && !secondary) return null

  return (
    <span className="ulr-actions">
      {primary ? <ActionButton action={primary} /> : <ActionButtonPlaceholder />}
      {secondary ? <ActionButton action={secondary} /> : <ActionButtonPlaceholder />}
    </span>
  )
}

function ActionButton({ action }: { action: NonNullable<UniversalListRowProps['primaryAction']> }) {
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

function ActionButtonPlaceholder() {
  // Renders a non-interactive spacer matching the IconButton sm size so the
  // right edge stays optically locked across rows even when one row has
  // primary-only and another has both.
  return <span className="ulr-action-placeholder" aria-hidden />
}
