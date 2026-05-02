/**
 * Dossier type contract for the public artist/studio worlds rendered at
 * `cmngrdn.com/{slug}`.
 *
 * Single source of truth. The cgos dashboard's `<DossierEditor>` writes
 * `workspaces.dossier` (this shape); cmngrdn's `<DossierStage>` reads it.
 *
 * cmngrdn additionally owns the `DOSSIERS` static fallback dictionary +
 * `getDossier()` resolver (in cmngrdn `src/lib/dossiers.ts`) — those are
 * cmngrdn-specific (the cgos editor reads through `/api/workspaces/{slug}/
 * dossier` directly, no fallback dictionary needed). The TYPE CONTRACT
 * (everything below) lives here and both repos shim from it.
 *
 * Previously mirrored across both repos with a "keep in sync" warning —
 * Phase 2.6 of the design system unification (2026-05-02) lifted it here.
 */

export type DossierLink = {
  label: string
  href: string
  external?: boolean
}

export type DossierMission = {
  name: string
  kind: string
  kind_subtitle?: string
  /** Left strip + progress-bar color. Defaults to workspace accent if absent. */
  accent?: string
  /** 0–1 fractional progress, drawn as a gradient bar at the card's bottom edge.
   *  Two color stops: `accent` (filled portion) → `accent_secondary || warm`. */
  progress?: number
  /** Optional second stop for the progress gradient. Defaults to --cg-warm. */
  accent_secondary?: string
  href?: string
}

export type DossierService = {
  name: string
  kind: string
  kind_subtitle?: string
  blurb?: string
  accent?: string
  cta_label?: string
  href?: string
}

export type DossierTransmissionKind =
  | 'spotify'
  | 'youtube'
  | 'instagram'
  | 'site'
  | 'release'
  | 'other'

export type DossierTransmission = {
  kind: DossierTransmissionKind
  title: string
  source_label: string
  /** ISO date — rendered as relative ("3 days ago"). Sort descending by this. */
  published_at: string
  href?: string
}

export type DossierGroveMember = {
  /** Optional — links the card to /[slug] on cmngrdn. */
  workspace_slug?: string
  label: string
  role: string
}

export type DossierVariant = 'artist' | 'studio'

export type Dossier = {
  /** Primary name shown in the sidebar (overrides workspace.name). */
  display_name: string
  /** Operator credit shown below the display name. */
  operator?: string
  /** Archetype chip — STUDIO / ARTIST / VISIONARY / BUILDER / OPERATOR / etc. */
  archetype: string
  /** Additional chips next to archetype (personality codes, modifiers). */
  archetype_chips?: string[]

  // Sidebar stat blocks
  coordinates?: string
  rooted?: string
  frequency?: string
  signal?: string

  // Sidebar sub-nav at the bottom
  links?: DossierLink[]

  /** Selects canvas layout: 'studio' uses Services + optional intro,
   *  'artist' uses Missions. Both share Transmissions + Grove. */
  variant: DossierVariant

  // Canvas content
  intro?: string // optional studio bio paragraph above services
  missions?: DossierMission[]
  services?: DossierService[]
  transmissions?: DossierTransmission[]
  grove?: DossierGroveMember[]
}

export const EMPTY_DOSSIER: Dossier = {
  display_name: '',
  archetype: '',
  variant: 'artist',
}

/** Source-of-truth list rendered next to the kind dropdown in the editor. */
export const TRANSMISSION_KINDS: ReadonlyArray<{
  value: DossierTransmissionKind
  label: string
}> = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'site', label: 'Site' },
  { value: 'release', label: 'Release' },
  { value: 'other', label: 'Other' },
]
