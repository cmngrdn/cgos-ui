/**
 * The list-row family's vocabulary — row, card and tile share it.
 *
 * Spec: docs/list-row-template.md (row · "Card sibling" · "Tile sibling").
 *
 * HOISTED from cmngrdn `src/components/hq/list/types.ts` in v0.71.0, with the
 * three atoms that read it (`ui/UniversalListRow`, `ui/UniversalCard`,
 * `ui/UniversalTile`). The contract doc had named these atoms "(forthcoming)"
 * in this package since it was written; they lived in cmngrdn the whole time.
 * Kept byte-equivalent in shape so moving a consumer's import is the whole
 * migration.
 *
 * Lives in `lib/` rather than beside the atoms because it is data, not a
 * component — the same reason `lib/dossier.ts` and `lib/pass-art.ts` do.
 */

import type { ReactNode, MouseEvent, ComponentType } from 'react'

// ──────────────────────────────────────────────────────────────────────────
// Status-spine tokens
// Maps a semantic status to the existing `--cg-status-*` token set.
// Per-module status → SpineToken mapping lives in each consumer's `types/status.ts`
// or inline in the page (Projects/Assets currently inline it).
// ──────────────────────────────────────────────────────────────────────────

export type SpineToken =
  | 'success'    // live, sent, confirmed, active, available
  | 'warning'    // production, pre-release, sending, tentative, running
  | 'amber'      // alias for warning when consumers prefer yellow over orange
  | 'purple'     // conceptualization, member-owner
  | 'cyan'       // review, revision, editor
  | 'blue'       // scheduled, admin
  | 'danger'     // failed, cancelled, error
  | 'neutral'    // archived, draft, pending, default-empty, viewer
  | 'magenta'    // canon
  | 'accent'     // unread / state highlight
  | 'transparent'

export const SPINE_VAR: Record<SpineToken, string> = {
  success:     'var(--cg-status-success)',
  warning:     'var(--cg-status-warning)',
  amber:       'var(--cg-status-amber)',
  purple:      'var(--cg-status-purple)',
  cyan:        'var(--cg-status-cyan)',
  blue:        'var(--cg-status-blue)',
  danger:      'var(--cg-status-danger)',
  neutral:     'var(--cg-status-neutral)',
  magenta:     'var(--cg-status-magenta)',
  accent:      'var(--cg-accent)',
  transparent: 'transparent',
}

// ──────────────────────────────────────────────────────────────────────────
// Thumb slot
// ──────────────────────────────────────────────────────────────────────────

export type ThumbSlot =
  | { kind: 'image'; url: string; alt: string }
  | { kind: 'icon'; Icon: ComponentType<{ size?: number; weight?: 'regular' | 'fill' | 'duotone'; color?: string }>; tint?: string }
  | { kind: 'mark'; char: string; tint?: string }
  | { kind: 'swatch'; color: string }

// ──────────────────────────────────────────────────────────────────────────
// Right anchor variants
// ──────────────────────────────────────────────────────────────────────────

/**
 * One channel a record was routed to, for the `coverage` anchor.
 *
 * The consumer supplies only the GLYPH — the atom owns the layout, the
 * lit-vs-dim treatment and the overflow roll-up — so the row primitive stays
 * free of any platform vocabulary and can still hoist to cgos-ui. Same seam as
 * `thumb: { kind: 'icon', Icon }`, where the caller picks the icon and the atom
 * owns the 40px box.
 */
export interface CoverageChannel {
  key: string
  glyph: ReactNode
  /** Hover text — "YouTube · published". */
  label: string
  /** Lit when the channel actually went out; dim while it is still queued. */
  published: boolean
}

export type RightAnchor =
  | { kind: 'progress'; value: number; total: number; accent?: string }
  | { kind: 'time'; iso: string; relative?: boolean }
  /**
   * Channel coverage — "where did this go", answered at a glance.
   *
   * The fourth variant, added for the merged Content list (2026-08-19). The
   * first three answer *how far along* or *when*; a post's right edge has to
   * answer *where*, and neither of those can say it. It is what makes a
   * separate anchor x channel grid unnecessary while the channel count is
   * small — see the Coverage note in CLAUDE.md.
   *
   * `emptyLabel` renders in place of the glyphs when nothing is routed yet, so
   * an unrouted row still reads as a deliberate state rather than a blank edge.
   */
  | { kind: 'coverage'; channels: CoverageChannel[]; max?: number; emptyLabel?: string }
  | { kind: 'none' }

// ──────────────────────────────────────────────────────────────────────────
// Row action
// Buttons render even when href + onClick are both absent (disabled state) so
// the right edge stays optically locked across rows in the same list.
// ──────────────────────────────────────────────────────────────────────────

export interface RowAction {
  Icon: ComponentType<{ size?: number; weight?: 'regular' | 'fill' | 'duotone'; color?: string }>
  label: string
  href?: string
  onClick?: (e: MouseEvent) => void
  /** Optional "active" state for things like a copy button's just-clicked feedback. */
  active?: boolean
}

// ──────────────────────────────────────────────────────────────────────────
// UniversalListRow props
// ──────────────────────────────────────────────────────────────────────────

export interface UniversalListRowProps {
  // Spine
  spine: SpineToken
  spineTooltip?: string

  /** Optional selection slot (e.g. bulk-action checkbox). Renders AFTER the
   *  spine and BEFORE the thumb so the spine stays at the visible row edge.
   *  Audience is the canonical consumer — keeps the row layout consistent
   *  with non-selectable lists (Library, Transmissions) while preserving the
   *  bulk-action affordance. */
  selectionSlot?: ReactNode

  // Body
  thumb: ThumbSlot
  thumbCornerPortalDot?: { tone: 'accent' | 'amber' | 'muted' }

  name: string
  subMeta?: ReactNode

  // Right anchor
  rightAnchor: RightAnchor

  // Right anchor — action buttons (always rendered, disabled when N/A)
  primaryAction?: RowAction
  secondaryAction?: RowAction

  // Behavior
  onClick?: () => void
  /** CHOSEN — the operator ticked this row for a bulk action. */
  selected?: boolean
  /**
   * WHERE THE KEYBOARD IS — a cursor, not a choice, and deliberately a
   * different prop from `selected`. Arrowing through a list moves this; it
   * does not tick anything, and a row can be both (the cursor resting on a
   * row that is also checked). One prop for both would make "ticked for
   * deletion" and "the arrow key happens to be here" the same colour.
   */
  focused?: boolean
}

// ──────────────────────────────────────────────────────────────────────────
// UniversalTile props
// ──────────────────────────────────────────────────────────────────────────

export type TileBottomSlot =
  | { kind: 'progress'; value: number; total: number; accent?: string }
  | { kind: 'edition'; serial: string; cap?: string }
  | { kind: 'custom'; node: ReactNode }
  | { kind: 'none' }

export interface UniversalTileProps {
  spine: SpineToken
  spineTooltip?: string
  thumb: ThumbSlot
  thumbCornerPortalDot?: { tone: 'accent' | 'amber' | 'muted' }
  name: string
  /** Same per-module sub-meta content rendered in `UniversalListRow` —
   *  tile + list view share field-mapping so the eye reads the same data
   *  in both modes. */
  subMeta?: ReactNode
  bottomSlot: TileBottomSlot
  onClick?: () => void
  selected?: boolean
}

// ──────────────────────────────────────────────────────────────────────────
// UniversalCard — the middle-density tier between row and tile.
//
// Same status-spine + adapter vocabulary as UniversalListRow, but surfaces
// MULTIPLE dimensions at once: bigger media, an eyebrow (type · sub · time),
// a name, a compact fact cluster, and ONE "signal" (the widget moment). Each
// consumer's adapter fills the slots it has and picks the signal that fits
// the record type — a transmission shows a status pill, a portal page a
// sparkline, a collectible an edition bar.
//
// Kept dependency-free, which is what let it hoist alongside the row + tile.
// The `custom` signal slot is the escape hatch for dropping a real Pulse
// primitive (TrendChart / StackedBar) in where per-item aggregated data
// exists — the atom never imports it directly.
// ──────────────────────────────────────────────────────────────────────────

/** Media is the row/tile thumb vocabulary PLUS a date-block variant for
 *  time-anchored records (appointments, events). */
export type CardMedia =
  | ThumbSlot
  | { kind: 'date'; month: string; day: string; time?: string }

/** A labeled micro-stat. 0–3 per card. The "more than a row" payload. */
export interface CardFact {
  label: string
  value: string
}

/** The signal slot — ONE per card, adapter-picked. */
export type CardSignal =
  // Labeled progress bar (edition fill, completeness, pipeline).
  | { kind: 'progress'; value: number; total: number; label?: string; valueLabel?: string; accent?: string }
  // A single emphasized number with a caption.
  | { kind: 'stat'; label: string; value: string; accent?: string }
  // A status word tinted to a spine token (reinforces the color spine with text).
  | { kind: 'pill'; label: string; tone: SpineToken }
  // Self-rendered micro-sparkline from raw y-values (zero-dependency).
  | { kind: 'sparkline'; points: number[]; label?: string; delta?: string; accent?: string }
  // Escape hatch — drop a real Pulse primitive (TrendChart, StackedBar, …) here.
  | { kind: 'custom'; node: ReactNode; label?: string }
  | { kind: 'none' }

/** Footer chip — quiet metadata (format, rarity, world). */
export interface CardChip {
  label: string
  tone?: 'default' | 'accent' | 'amber'
}

export interface UniversalCardProps {
  // Spine
  spine: SpineToken
  spineTooltip?: string

  /** Optional bulk-select checkbox (same contract as the row). */
  selectionSlot?: ReactNode

  // Media (left) + a corner type-stamp on top of it
  media: CardMedia
  /** Background wash behind icon / mark / date media. Defaults to surface. */
  mediaTint?: string
  typeIcon?: ComponentType<{ size?: number; weight?: 'regular' | 'fill' | 'duotone'; color?: string }>

  // Eyebrow — type · sub · timestamp
  typeLabel: string
  subLabel?: string
  timestamp?: string

  // Title
  name: string

  // Facts + signal (the body payload)
  facts?: CardFact[]
  signal?: CardSignal

  // Footer — chips + up to 2 actions (same RowAction vocabulary as the row)
  chips?: CardChip[]
  primaryAction?: RowAction
  secondaryAction?: RowAction

  // Behavior
  onClick?: () => void
  selected?: boolean
}
