import { type CSSProperties, type ComponentType, type SVGProps } from 'react'

/**
 * ModuleIconChip — Liquid Glass tinted chip for module-tile icons.
 *
 * The "Unified Glass Treatment" recipe locked in `cgos/docs/v2-palette-swatch.html`
 * (Studio V2 Phase A, 2026-05-14). One chip recipe, both themes. The chip
 * composes with whatever `--cg-bg-elevated` / `--cg-glass-bg` resolve to per
 * theme — dark over dark-elevated, cream over cream-elevated. Same design,
 * theme-aware composition.
 *
 * Recipe (in style order):
 *   - Background: 24% module-color mixed into `--cg-glass-bg` (theme-cascaded)
 *   - Border: 1px 45% module-color mixed into `--cg-glass-border`
 *   - Shadow: rim highlight via `inset 0 1px 0 --cg-glass-border-top`,
 *     plus `--cg-elev-2` resting elevation
 *   - Backdrop blur via `--cg-glass-blur`
 *   - Icon: by default colored as the module accent; pass `iconColor` to
 *     override (Home uses `var(--cg-text)` so a white-tinted chip stays
 *     legible on the cream light theme)
 *
 * Use anywhere a module accent needs to read as "lifted glass" — sidebar
 * tiles, mobile launcher tiles, search-result rows, dashboard module
 * cards. Always pass the module's color hex / token; the chip handles the
 * tint math so all surfaces stay visually identical.
 *
 * Pure presentational atom — does not own hover, focus, or active states.
 * The parent button/anchor owns those (typically a scale transform or
 * elevation lift; see consumers in cmngrdn `NavTile` + `MobileDrawer`).
 *
 * Polymorphism: accepts an `icon` component (any `(props) => ReactNode`
 * that takes width/height) — pass `Phosphor.Bookmark`, a custom SVG
 * component, anything that renders inside a sized container.
 */

export interface ModuleIconChipProps {
  /** Module accent color — hex string (`#2dd4a8`) or CSS var (`var(--cg-accent)`). */
  color: string
  /** Icon component rendered inside the chip. Receives width/height. */
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** Chip side length in px. Default 56 (swatch baseline). */
  size?: number
  /**
   * Icon size as a fraction of the chip side. Default 0.54 (30px on a 56px
   * chip — matches the swatch). Increase for chunky icons on small chips,
   * decrease for fine icons on large chips.
   */
  iconScale?: number
  /**
   * Icon color override. Defaults to the chip's `color` so the icon matches
   * the tint. Pass `var(--cg-text)` for Home (white chip → use text color
   * so the icon stays visible on both themes).
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
  color,
  icon: Icon,
  size = 56,
  iconScale = 0.54,
  iconColor,
  radius = 14,
  style,
  className,
  ariaLabel,
}: ModuleIconChipProps) {
  const iconPx = Math.round(size * iconScale)
  return (
    <span
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
        background: `color-mix(in srgb, ${color} 24%, var(--cg-glass-bg))`,
        WebkitBackdropFilter: 'var(--cg-glass-blur)',
        backdropFilter: 'var(--cg-glass-blur)',
        border: `1px solid color-mix(in srgb, ${color} 45%, var(--cg-glass-border))`,
        boxShadow: 'inset 0 1px 0 var(--cg-glass-border-top), var(--cg-elev-2)',
        color: iconColor ?? color,
        ...style,
      }}
    >
      <Icon width={iconPx} height={iconPx} />
    </span>
  )
}
