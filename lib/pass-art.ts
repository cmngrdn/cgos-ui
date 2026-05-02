/**
 * TypeScript types + render helpers for `workspaces.pass_art` (JSONB).
 * Shape documented in cgos `docs/fan-system-pass-spec.md` §Data model.
 *
 * Single source of truth for both the dashboard editor (PassArtEditor /
 * PassArtVariantEditor / EraEditor) and the public renderer (cmngrdn
 * `/me/[artistSlug]` PassCard mount). Previously mirrored across both
 * repos with a "keep in sync" warning — that warning is retired now that
 * this file lives in cgos-ui.
 */

export interface PassLevelTier {
  min_level: number
  label: string
  overrides?: Partial<PassArt>
}

export interface PassArt {
  // Colors
  background_color?: string | null
  foreground_color?: string | null
  label_color?: string | null
  // Text
  logo_text?: string | null
  // Images (all Supabase Storage URLs — Airtable URLs expire)
  logo_image_url?: string | null
  icon_image_url?: string | null
  strip_image_url?: string | null
  thumbnail_image_url?: string | null
  background_image_url?: string | null
  footer_image_url?: string | null
  // Effects
  strip_effect?: 'foil' | null
  // Progression (resolved by the render pipeline, not the editor yet)
  level_tiers?: PassLevelTier[]
}

export const EMPTY_PASS_ART: PassArt = {}

export type PassArtImageKind =
  | 'logo'
  | 'icon'
  | 'strip'
  | 'thumbnail'
  | 'background'
  | 'footer'

/**
 * A named, dated window where pass art is overridden. Mirror of `pass_eras`
 * columns. Network-scoped eras have `workspace_id = null`.
 */
export interface PassEra {
  id: string
  tag: string
  name: string
  description?: string | null
  designer_name?: string | null
  designer_credit_url?: string | null
  scope: 'network' | 'workspace'
  workspace_id?: string | null
  starts_at: string
  ends_at: string
  is_active: boolean
}

/**
 * Per-(era, workspace) art override. Spread onto the workspace's base
 * `pass_art` when the era is active.
 */
export interface PassArtVariant {
  id: string
  era_id: string
  workspace_id: string
  art: PassArt
}

/**
 * Resolve the active level tier for a given level and merge its overrides onto base art.
 * Picks the tier with the highest `min_level` where `level >= min_level`.
 * Returns `{ art, tier }` — `tier` is the matched tier (or null) so callers can show the label.
 */
export function resolveLevelArt(
  art: PassArt,
  level: number | null | undefined,
): { art: PassArt; tier: PassLevelTier | null } {
  const tiers = art.level_tiers
  if (!tiers || tiers.length === 0 || level == null) {
    return { art, tier: null }
  }
  const match = tiers
    .filter((t) => level >= t.min_level)
    .sort((a, b) => b.min_level - a.min_level)[0]
  if (!match) return { art, tier: null }
  const merged: PassArt = { ...art, ...(match.overrides || {}) }
  delete merged.level_tiers
  return { art: merged, tier: match }
}

/**
 * Full render pipeline: base → active era variant → level tier.
 *
 * Compose order matches docs/fan-system-pass-spec.md §Render pipeline:
 *   1. `base` (workspaces.pass_art)
 *   2. `variant.art` overrides (per-era, workspace-specific)
 *   3. level tier override (highest matching `min_level`)
 *
 * Caller pre-loads the active era + variant; this is a pure merge.
 */
export function resolveActivePassArt(input: {
  base: PassArt
  variant?: PassArtVariant | null
  era?: PassEra | null
  level?: number | null
}): { art: PassArt; tier: PassLevelTier | null; era: PassEra | null } {
  const { base, variant, era, level } = input
  const withEra: PassArt = variant?.art ? { ...base, ...variant.art } : base
  const { art, tier } = resolveLevelArt(withEra, level)
  return { art, tier, era: era ?? null }
}
