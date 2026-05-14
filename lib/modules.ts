/**
 * Module registry — canonical metadata for every sidebar module in the
 * Common Garden Studio (cmngrdn `/hq/*` + dashboard sidebar).
 *
 * Single source of truth for module slug → {label, colorToken, accent}.
 * Both cmngrdn and the legacy dashboard sidebar consume this so the V2
 * sidebar visual language stays in lockstep across front doors.
 *
 * Icons are consumed separately (Phosphor Duotone — see ModuleIcon types
 * in the consumer; we don't import the icon library here to keep cgos-ui
 * runtime-free of icon-library deps).
 *
 * Order matches the locked V2 sidebar sequence:
 *   Home · Journey · Vault · World · Dispatch · Offerings · Pulse ·
 *   Service · Workspace · Settings · Admin
 *
 * Each entry's `colorToken` is a CSS custom property name that resolves
 * to the module's accent color via `tokens.css`. Use `accent` for the
 * resolved hex (useful for non-CSS contexts like SVG fills).
 */

export type ModuleSlug =
  | 'home'
  | 'journey'
  | 'vault'
  | 'world'
  | 'dispatch'
  | 'offerings'
  | 'pulse'
  | 'service'
  | 'workspace'
  | 'settings'
  | 'admin'

export interface ModuleMeta {
  slug: ModuleSlug
  label: string
  /** CSS custom property name (e.g. `--cg-module-home`). Use via `var(...)`. */
  colorToken: string
  /** Resolved hex for non-CSS contexts (SVG fills, JS canvas). */
  accent: string
  /** Phosphor Duotone icon name (consumer maps to actual icon component). */
  phosphorIcon: string
  /** Sort order in the sidebar (lower = earlier). */
  navOrder: number
}

export const MODULE_REGISTRY: Record<ModuleSlug, ModuleMeta> = {
  home: {
    slug: 'home',
    label: 'Home',
    colorToken: '--cg-module-home',
    accent: '#ffffff',
    phosphorIcon: 'bookmark',
    navOrder: 0,
  },
  journey: {
    slug: 'journey',
    label: 'Journey',
    colorToken: '--cg-module-journey',
    accent: '#ff5ec8',
    phosphorIcon: 'compass-rose',
    navOrder: 10,
  },
  vault: {
    slug: 'vault',
    label: 'Vault',
    colorToken: '--cg-module-vault',
    accent: '#ff8a3d',
    phosphorIcon: 'keyhole',
    navOrder: 20,
  },
  world: {
    slug: 'world',
    label: 'World',
    colorToken: '--cg-module-world',
    accent: '#b78bff',
    phosphorIcon: 'globe',
    navOrder: 30,
  },
  dispatch: {
    slug: 'dispatch',
    label: 'Dispatch',
    colorToken: '--cg-module-dispatch',
    accent: '#3d5afe',
    phosphorIcon: 'broadcast',
    navOrder: 40,
  },
  offerings: {
    slug: 'offerings',
    label: 'Offerings',
    colorToken: '--cg-module-offerings',
    accent: '#ffd24a',
    phosphorIcon: 'flower-lotus',
    navOrder: 50,
  },
  pulse: {
    slug: 'pulse',
    label: 'Pulse',
    colorToken: '--cg-module-pulse',
    accent: '#a3e635',
    phosphorIcon: 'graph',
    navOrder: 60,
  },
  service: {
    slug: 'service',
    label: 'Service',
    colorToken: '--cg-module-service',
    accent: '#2dd4a8',
    phosphorIcon: 'toolbox',
    navOrder: 70,
  },
  workspace: {
    slug: 'workspace',
    label: 'Workspace',
    colorToken: '--cg-module-workspace',
    accent: '#6dc0ff',
    phosphorIcon: 'users',
    navOrder: 80,
  },
  settings: {
    slug: 'settings',
    label: 'Settings',
    colorToken: '--cg-module-settings',
    accent: '#6b7280',
    phosphorIcon: 'gear',
    navOrder: 90,
  },
  admin: {
    slug: 'admin',
    label: 'Admin',
    colorToken: '--cg-module-admin',
    accent: '#ef4444',
    phosphorIcon: 'shield-warning',
    navOrder: 100,
  },
}

/** Ordered list — convenient for sidebar rendering. */
export const MODULE_ORDER: ModuleSlug[] = (Object.keys(MODULE_REGISTRY) as ModuleSlug[]).sort(
  (a, b) => MODULE_REGISTRY[a].navOrder - MODULE_REGISTRY[b].navOrder,
)

export function getModuleMeta(slug: ModuleSlug): ModuleMeta {
  return MODULE_REGISTRY[slug]
}
