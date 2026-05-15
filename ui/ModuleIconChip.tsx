import { type CSSProperties, type ComponentType, type SVGProps } from 'react'

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
 * Pure presentational atom — does not own hover, focus, or active states.
 * The parent button/anchor owns those.
 */

export type ModuleIconChipVariant = 'translucent' | 'iridescent'

export interface ModuleIconChipProps {
  /** Module accent color — hex string (`#2dd4a8`) or CSS var (`var(--cg-accent)`). */
  color: string
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

function translucentStyle(color: string, iconColor?: string): CSSProperties {
  return {
    background: `color-mix(in srgb, ${color} 24%, var(--cg-glass-bg))`,
    WebkitBackdropFilter: 'var(--cg-glass-blur)',
    backdropFilter: 'var(--cg-glass-blur)',
    border: `1px solid color-mix(in srgb, ${color} 45%, var(--cg-glass-border))`,
    boxShadow: 'inset 0 1px 0 var(--cg-glass-border-top), var(--cg-elev-2)',
    color: iconColor ?? color,
  }
}

function iridescentStyle(color: string, iconColor?: string): CSSProperties {
  return {
    // Radial highlight layered over a vertical 3-stop gradient — keeps the
    // gradient in the accent's hue family (color-mix with white/black) so
    // the chip stays "in the color" while still feeling lit from above.
    background: [
      'radial-gradient(ellipse 75% 60% at 30% 18%, rgba(255,255,255,0.32), transparent 65%)',
      `linear-gradient(180deg, color-mix(in srgb, ${color} 90%, white 10%) 0%, ${color} 55%, color-mix(in srgb, ${color} 85%, black 15%) 100%)`,
    ].join(', '),
    border: '1px solid transparent',
    // Apple HIG "lifted glass": rim highlight at the top edge + subtle
    // inset bottom shadow + outer accent glow + drop shadow.
    boxShadow: [
      'inset 0 1px 0 rgba(255, 255, 255, 0.55)',
      'inset 0 -1px 0 rgba(0, 0, 0, 0.16)',
      `0 0 24px color-mix(in srgb, ${color} 35%, transparent)`,
      '0 6px 14px rgba(0, 0, 0, 0.30)',
    ].join(', '),
    color: iconColor ?? 'rgba(255, 255, 255, 0.97)',
  }
}

export function ModuleIconChip({
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
  const variantStyle =
    variant === 'iridescent'
      ? iridescentStyle(color, iconColor)
      : translucentStyle(color, iconColor)
  return (
    <span
      data-module-chip-variant={variant}
      className={className}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: radius,
        ...variantStyle,
        ...style,
      }}
    >
      <Icon width={iconPx} height={iconPx} />
    </span>
  )
}
