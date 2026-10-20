import { type CSSProperties, type ComponentType, type SVGProps } from 'react'
import { appColor, type AppId } from '../lib/apps'

/**
 * ModuleIconChip — module-tile icon surface. Two recipes via `variant`.
 *
 * Both lock in `cgos/docs/v2-palette-swatch.html` (Studio V2 Phase A,
 * 2026-05-14). One chip atom, two visual treatments — same API, callers
 * flip via `variant` to A/B which one ships.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * variant="translucent"  ← default. The "Unified Glass Treatment."
 * ─────────────────────────────────────────────────────────────────────────
 * Recipe:
 *   - Background: 24% module color mixed into `--cg-glass-bg` (theme-cascaded)
 *   - Border: 1px 45% module color mixed into `--cg-glass-border`
 *   - Shadow: rim highlight via `inset 0 1px 0 --cg-glass-border-top`
 *     + `--cg-elev-2` resting elevation
 *   - Backdrop blur via `--cg-glass-blur` so the chip composes with the
 *     surface behind it
 *   - Icon color defaults to the module accent (so the icon AND the tint
 *     share one hue family). Override via `iconColor` for white-chip case.
 *
 * Reads as a control-surface chip — tinted glass, soft.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * variant="iridescent"  ← the "embossed app-icon" treatment.
 * ─────────────────────────────────────────────────────────────────────────
 * Recipe:
 *   - Background: solid color BASE — radial top-left dome highlight
 *     (rgba(255,255,255,0.32)) layered over a vertical 3-stop gradient
 *     (lighter at top → accent at 55% → darker at bottom) using `color-mix`
 *     so the gradient stays in the accent's hue family
 *   - Shadow: rim highlight + inset bottom shadow + outer accent glow + drop
 *     shadow — the "embossed glass tile" depth recipe
 *   - No backdrop blur (it's a solid surface, not a translucent material)
 *   - Icon color defaults to white at 97% (since the chip is fully colored;
 *     white reads cleanly across every accent except the deliberately
 *     near-white Home chip — pass `iconColor` to override)
 *
 * Reads as an iOS app icon — saturated, embossed, present.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Use anywhere a module accent needs to read as a tile — sidebar tiles,
 * mobile launcher tiles, search-result rows, dashboard module cards.
 * Always pass the module's color hex / token; the chip handles all the
 * tint math so all surfaces stay visually identical.
 *
 * Styling lives in `ui/ModuleIconChip.css` (imported by `cgos-ui/index.css`);
 * the per-instance values travel as custom properties, so a consumer
 * stylesheet can restyle it (U2). Pass `app` for an HQ app — its colour is
 * the `--cg-app-<id>` token (K6) — instead of a hex `color`.
 *
 * Pure presentational atom — does not own hover, focus, or active states.
 * The parent button/anchor owns those.
 */

export type ModuleIconChipVariant = 'translucent' | 'iridescent'

export interface ModuleIconChipProps {
  /** An HQ app: its colour is the `--cg-app-<id>` token. Preferred over `color`. */
  app?: AppId
  /** Accent colour — a CSS var (`var(--cg-accent)`) or, for non-app tiles, a literal. Ignored when `app` is set. */
  color?: string
  /** Icon component rendered inside the chip. Receives width/height. */
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /**
   * Visual variant. Defaults `'translucent'` (Liquid Glass tinted) for
   * backward-compat with the V2 Phase A ship. Pass `'iridescent'` for the
   * solid-color embossed treatment.
   */
  variant?: ModuleIconChipVariant
  /** Chip side length in px. Default 56 (swatch baseline). */
  size?: number
  /**
   * Icon size as a fraction of the chip side. Default 0.54 (30px on a 56px
   * chip — matches the swatch). Increase for chunky icons on small chips,
   * decrease for fine icons on large chips.
   */
  iconScale?: number
  /**
   * Icon color override. By default:
   *   translucent → defaults to the module accent (icon shares hue)
   *   iridescent  → defaults to white at 97% (white reads on saturated fill)
   * Pass to override (e.g. Home's near-white chip wants `var(--cg-text)` so
   * the icon stays legible on both themes).
   */
  iconColor?: string
  /** Border radius in px. Default 14 (swatch baseline). */
  radius?: number
  /** Inline style overrides (composed on top of the chip styles). */
  style?: CSSProperties
  /** Optional className for parent CSS hooks (active states, etc). */
  className?: string
  /** Accessible label — most consumers wrap the chip in a labelled button
   *  so the chip itself stays `aria-hidden`. Pass to override. */
  ariaLabel?: string
}

export function ModuleIconChip({
  app,
  color,
  icon: Icon,
  variant = 'translucent',
  size = 56,
  iconScale = 0.54,
  iconColor,
  radius = 14,
  style,
  className,
  ariaLabel,
}: ModuleIconChipProps) {
  const iconPx = Math.round(size * iconScale)
  const vars = {
    '--cg-chip-color': app ? appColor(app) : color,
    '--cg-chip-size': `${size}px`,
    '--cg-chip-radius': `${radius}px`,
    ...(iconColor ? { '--cg-chip-icon': iconColor } : null),
  } as CSSProperties
  return (
    <span
      data-module-chip-variant={variant}
      data-cg-app={app}
      className={className}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{ ...vars, ...style }}
    >
      <Icon width={iconPx} height={iconPx} />
    </span>
  )
}
