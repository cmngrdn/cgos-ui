/**
 * TypeScript types + render helpers for `workspaces.pass_art` (JSONB).
 * Shape documented in cgos `docs/fan-system-pass-spec.md` §Data model.
 *
 * Single source of truth for both the dashboard editor (PassArtEditor /
 * PassArtVariantEditor / EraEditor) and the public renderer (cmngrdn
 * `/me/[artistSlug]` PassCard mount).
 *
 * Schema honesty pass (2026-05-14): aligned to what Apple Wallet's
 * storeCard pass type actually renders. Removed:
 *   - background_image_url (storeCard ignores it; only eventTicket uses
 *     backgrounds, and even there it's heavily blurred)
 *   - footer_image_url (only boardingPass uses footer)
 *   - strip_effect (custom CG aesthetic; no PassKit equivalent)
 *   - level_tiers / PassLevelTier (level-progression UI deferred until
 *     rebuilt against honest renderings)
 *
 * If you need a non-Wallet visual approximation that wants a background
 * image (e.g. the cmngrdn home-page wallet pass spectacle), define a
 * local extended interface in your component — don't add it back here.
 */

export interface PassArt {
  // Colors — Apple Wallet expects `rgb(R, G, B)` strings only.
  background_color?: string | null
  foreground_color?: string | null
  label_color?: string | null
  // Text
  logo_text?: string | null
  // Images (all Supabase Storage URLs — Airtable URLs expire). Slot
  // names match Apple PassKit's `pass.json` image filenames so the
  // mapping at signing time is 1:1.
  logo_image_url?: string | null
  icon_image_url?: string | null
  strip_image_url?: string | null
  thumbnail_image_url?: string | null
}

export const EMPTY_PASS_ART: PassArt = {}

export type PassArtImageKind =
  | 'logo'
  | 'icon'
  | 'strip'
  | 'thumbnail'

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
 * Full render pipeline: base → active era variant.
 *
 * Compose order matches docs/fan-system-pass-spec.md §Render pipeline:
 *   1. `base` (workspaces.pass_art)
 *   2. `variant.art` overrides (per-era, workspace-specific)
 *
 * Caller pre-loads the active era + variant; this is a pure merge.
 *
 * Level-tier resolution (`resolveLevelArt`) was removed in the schema
 * honesty pass — will be reintroduced when the level-progression UX
 * is rebuilt against honest storeCard renderings.
 */
export function resolveActivePassArt(input: {
  base: PassArt
  variant?: PassArtVariant | null
  era?: PassEra | null
}): { art: PassArt; era: PassEra | null } {
  const { base, variant, era } = input
  const art: PassArt = variant?.art ? { ...base, ...variant.art } : base
  return { art, era: era ?? null }
}
