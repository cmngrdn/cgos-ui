'use client'

/**
 * UniversalTile — the grid-view sibling of UniversalListRow.
 *
 * Spec: docs/list-row-template.md → "Tile sibling"
 *
 * Skeleton (top → bottom):
 *   1. 3px colored spine top edge (status)
 *   2. Thumbnail (1:1 by default, fills tile)
 *   3. Name (single line, truncates)
 *   4. Bottom slot — progress dots OR edition OR custom OR none
 *
 * No chips, no date, no meta line.
 */

import { useState } from 'react'
import { SPINE_VAR } from '../lib/list'
import type { UniversalTileProps } from '../lib/list'
import { CompletenessDots } from './CompletenessDots'
import './UniversalTile.css'

export type { UniversalTileProps, TileBottomSlot } from '../lib/list'

export function UniversalTile(props: UniversalTileProps) {
  const { spine, spineTooltip, thumb, thumbCornerPortalDot, name, subMeta, bottomSlot, onClick, selected } = props

  const [imgFailed, setImgFailed] = useState(false)

  return (
    <button
      className={`ult-tile${selected ? ' ult-tile-selected' : ''}`}
      onClick={onClick}
      title={spineTooltip}
      data-spine={spine}
    >
      <span
        className="ult-spine"
        aria-hidden
        style={{ background: SPINE_VAR[spine] }}
      />

      <span className="ult-thumb" aria-hidden>
        {thumb.kind === 'image' && !imgFailed ? (
          <img
            src={thumb.url}
            alt={thumb.alt}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="ult-thumb-img"
          />
        ) : thumb.kind === 'icon' ? (
          <span className="ult-thumb-icon" style={{ color: thumb.tint ?? 'var(--cg-text-muted)' }}>
            <thumb.Icon size={48} weight="duotone" />
          </span>
        ) : thumb.kind === 'mark' ? (
          <span className="ult-thumb-mark" style={{ color: thumb.tint ?? 'var(--cg-text-muted)' }}>
            {thumb.char}
          </span>
        ) : thumb.kind === 'swatch' ? (
          <span className="ult-thumb-swatch" style={{ background: thumb.color }} />
        ) : (
          <span className="ult-thumb-mark">✦</span>
        )}
        {thumbCornerPortalDot && (
          <span
            className="ult-portal-pip"
            data-tone={thumbCornerPortalDot.tone}
            aria-label="Portal page attached"
          />
        )}
      </span>

      <span className="ult-body">
        <span className="ult-name">{name}</span>
        {subMeta && <span className="ult-sub-meta">{subMeta}</span>}
        <span className="ult-bottom">
          {bottomSlot.kind === 'progress' ? (
            <CompletenessDots
              score={bottomSlot.value}
              total={bottomSlot.total}
              accent={bottomSlot.accent}
            />
          ) : bottomSlot.kind === 'edition' ? (
            <span className="ult-edition">
              #{bottomSlot.serial}
              {bottomSlot.cap ? <span className="ult-edition-cap"> / {bottomSlot.cap}</span> : null}
            </span>
          ) : bottomSlot.kind === 'custom' ? (
            bottomSlot.node
          ) : null}
        </span>
      </span>
    </button>
  )
}
