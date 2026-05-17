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

/* ─── v2 — Ref pattern ──────────────────────────────────────────────
 *
 * Dossier list items (missions / services / grove members) can be EITHER
 * "custom" (free-form entry, the legacy shape) OR a reference to a
 * canonical entity elsewhere in the system (a Library project, a Journey
 * quest, an Inquiry form, a Workspace). Ref-pattern fields are additive
 * + optional; pre-v2 rows without a `source` field are treated as custom.
 *
 * Why additive instead of a strict discriminated union: the legacy fields
 * stay populated as a write-time snapshot of the referenced entity, so
 * editors that haven't learned about refs yet (cgos dashboard's
 * <DossierEditor>) keep rendering something usable. cmngrdn's renderer
 * prefers fresh values from ref resolution + `override` at render time
 * and falls back to the cached snapshot only when context is missing.
 */

export type DossierMissionSource = 'custom' | 'library_project' | 'journey_quest'

export type DossierMissionOverride = {
  name?: string
  kind?: string
  kind_subtitle?: string
  accent?: string
  accent_secondary?: string
}

export type DossierMission = {
  /** Display fields — populated by the artist (custom) or by the picker
   *  as a write-time snapshot of the referenced entity. cmngrdn's renderer
   *  prefers fresh ref-resolved values + `override`; these are the fallback
   *  when context is missing AND the only values cgos dashboard sees. */
  name: string
  kind: string
  kind_subtitle?: string
  /** Left strip + progress-bar color. Defaults to workspace accent if absent. */
  accent?: string
  /** 0–1 fractional progress, drawn as a gradient bar at the card's bottom edge.
   *  Two color stops: `accent` (filled portion) → `accent_secondary || warm`.
   *  For custom missions: manual value set by the artist.
   *  For ref'd missions: ignored — derived at render from project status or quest progress. */
  progress?: number
  /** Optional second stop for the progress gradient. Defaults to --cg-warm. */
  accent_secondary?: string
  href?: string

  // ── v2 ─────────────────────────────────────────
  /** Data source discriminator. Absent or 'custom' = legacy free-form entry. */
  source?: DossierMissionSource
  /** Airtable record id when source='library_project' (stable across renames). */
  project_id?: string
  /** Supabase quests.id UUID when source='journey_quest'. */
  quest_id?: string
  /** Explicit per-field display overrides for ref'd missions. */
  override?: DossierMissionOverride
}

export type DossierServiceSource = 'custom' | 'inquiry_form'

export type DossierServiceOverride = {
  name?: string
  kind?: string
  kind_subtitle?: string
  blurb?: string
  accent?: string
  cta_label?: string
}

export type DossierService = {
  name: string
  kind: string
  kind_subtitle?: string
  blurb?: string
  accent?: string
  cta_label?: string
  href?: string

  // ── v2 ─────────────────────────────────────────
  /** Data source discriminator. Absent or 'custom' = legacy free-form entry. */
  source?: DossierServiceSource
  /** Supabase intake_forms.id UUID when source='inquiry_form'.
   *  href is derived at render from `/{workspace_slug}/inquiry/{form_slug}`. */
  form_id?: string
  /** Explicit per-field display overrides for ref'd services. */
  override?: DossierServiceOverride
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

export type DossierGroveMemberSource = 'custom' | 'workspace'

export type DossierGroveMemberOverride = {
  label?: string
  role?: string
}

export type DossierGroveMember = {
  /** Linked workspace slug — drives the card's <a href> on the public render.
   *  For custom members: manually set if the member happens to have a workspace.
   *  For workspace-ref'd members: written by the picker alongside workspace_id
   *  as a denormalized convenience so the renderer doesn't need to resolve the
   *  ref for a basic link. cmngrdn renders fresh slug from context when available. */
  workspace_slug?: string
  label: string
  role: string

  // ── v2 ─────────────────────────────────────────
  /** Data source discriminator. Absent or 'custom' = legacy free-form entry. */
  source?: DossierGroveMemberSource
  /** Supabase workspaces.id UUID when source='workspace' (stable across slug renames). */
  workspace_id?: string
  /** Explicit per-field display overrides for ref'd workspace members. */
  override?: DossierGroveMemberOverride
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
