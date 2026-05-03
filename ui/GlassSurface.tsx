import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from 'react'

/**
 * GlassSurface — translucent material surface atom.
 *
 * The Liquid Glass primitive: a styled container that applies
 * backdrop-blur + theme-aware tint + hairline border + elevation
 * shadow. Use for popovers, dropdowns, drawers, modal-adjacent
 * surfaces, navigation overlays — anywhere a surface needs to
 * signal "I'm above the page, but the page should still bleed
 * through me."
 *
 * Variants map to Apple HIG materials:
 *   frosted  — Regular material. Heavy enough blur to obscure
 *              content; good default for popovers / dropdowns /
 *              context menus / switcher.
 *   clear    — Thin material. Lighter blur, more translucent;
 *              good when content behind should remain readable.
 *   tinted   — Frosted + accent tint mixed in. For accent surfaces
 *              or workspace-themed overlays. Pass `tintColor`.
 *   chrome   — Thick material. Strongest blur + highest opacity.
 *              Toolbar / sidebar / nav.
 *
 * Elevation maps to `--cg-elev-N` shadow tokens (0..5):
 *   0: flat, no shadow
 *   1: chip / hover state
 *   2: resting card / panel (default)
 *   3: dropdown / popover / hover card
 *   4: modal / drawer
 *   5: floating overlay / mobile sheet
 *
 * Rim highlight (Apple HIG "Highlights" pattern): every elevation
 * adds an `inset 0 1px 0 var(--cg-glass-border-top)` to the box-shadow
 * — a brighter top edge that gives the "lifted glass" read even when
 * dark-on-dark contexts make the bleed-through invisible. Survives
 * border overrides (sidebar / InspectorDrawer override `border` for
 * single-edge styling — the rim is via shadow, not border, so it
 * stays).
 *
 * The atom does not handle hover, focus, or click states — it is a
 * presentational primitive. Wrap with a button or apply interactive
 * styles in the consumer.
 *
 * Polymorphism: pass `as` for semantic HTML (`'aside' | 'nav' | 'header'`
 * etc). Defaults to `'div'`.
 */

export type GlassVariant = 'frosted' | 'clear' | 'tinted' | 'chrome'
export type GlassElevation = 0 | 1 | 2 | 3 | 4 | 5
export type GlassRadius = 'sm' | 'md' | 'lg' | 'pill'
export type GlassElement =
  | 'div'
  | 'aside'
  | 'nav'
  | 'section'
  | 'header'
  | 'footer'
  | 'article'
  | 'main'

export interface GlassSurfaceProps extends Omit<HTMLAttributes<HTMLElement>, 'style'> {
  variant?: GlassVariant
  elevation?: GlassElevation
  /** Radius preset name maps to `--cg-glass-radius-*`; pass any CSS length string to override. */
  radius?: GlassRadius | string
  /** Tint color for `variant='tinted'`. Defaults to `var(--cg-accent)`. */
  tintColor?: string
  /** Container tag — defaults to 'div'. Use 'aside'/'nav'/'header' for semantic surfaces. */
  as?: GlassElement
  style?: CSSProperties
  children?: ReactNode
}

const RADIUS_TOKEN: Record<GlassRadius, string> = {
  sm: 'var(--cg-glass-radius-sm)',
  md: 'var(--cg-glass-radius-md)',
  lg: 'var(--cg-glass-radius-lg)',
  pill: 'var(--cg-glass-radius-pill)',
}

const ELEVATION_TOKEN: Record<GlassElevation, string> = {
  0: 'var(--cg-elev-0)',
  1: 'var(--cg-elev-1)',
  2: 'var(--cg-elev-2)',
  3: 'var(--cg-elev-3)',
  4: 'var(--cg-elev-4)',
  5: 'var(--cg-elev-5)',
}

function variantStyles(variant: GlassVariant, tintColor: string): CSSProperties {
  switch (variant) {
    case 'frosted':
      return {
        background: 'var(--cg-glass-bg)',
        WebkitBackdropFilter: 'var(--cg-glass-blur)',
        backdropFilter: 'var(--cg-glass-blur)',
        border: '1px solid var(--cg-glass-border)',
      }
    case 'clear':
      return {
        background: 'color-mix(in srgb, var(--cg-bg-elevated) 40%, transparent)',
        WebkitBackdropFilter: 'blur(12px) saturate(130%)',
        backdropFilter: 'blur(12px) saturate(130%)',
        border: '1px solid var(--cg-glass-border)',
      }
    case 'tinted':
      return {
        background: `color-mix(in srgb, ${tintColor} 8%, var(--cg-glass-bg))`,
        WebkitBackdropFilter: 'var(--cg-glass-blur)',
        backdropFilter: 'var(--cg-glass-blur)',
        border: `1px solid color-mix(in srgb, ${tintColor} 22%, var(--cg-glass-border))`,
      }
    case 'chrome':
      return {
        background: 'var(--cg-glass-bg-strong)',
        WebkitBackdropFilter: 'var(--cg-glass-blur-strong)',
        backdropFilter: 'var(--cg-glass-blur-strong)',
        border: '1px solid var(--cg-glass-border-strong)',
      }
  }
}

function resolveRadius(radius: GlassRadius | string): string {
  if (radius in RADIUS_TOKEN) return RADIUS_TOKEN[radius as GlassRadius]
  return radius
}

const RIM_HIGHLIGHT = 'inset 0 1px 0 var(--cg-glass-border-top)'

export const GlassSurface = forwardRef<HTMLElement, GlassSurfaceProps>(function GlassSurface(
  {
    variant = 'frosted',
    elevation = 2,
    radius = 'md',
    tintColor = 'var(--cg-accent)',
    as: Tag = 'div',
    style,
    children,
    ...rest
  },
  ref,
) {
  const variantCss = variantStyles(variant, tintColor)
  // Rim highlight: a brighter top edge composes with the elevation
  // shadow. At elevation 0 (`--cg-elev-0` resolves to `none`), we drop
  // the `none` and emit just the rim — `box-shadow: <inset>, none` is
  // invalid CSS.
  const elevToken = ELEVATION_TOKEN[elevation]
  const boxShadow = elevation === 0 ? RIM_HIGHLIGHT : `${RIM_HIGHLIGHT}, ${elevToken}`
  return (
    <Tag
      ref={ref as Ref<HTMLElement> as Ref<HTMLDivElement>}
      data-cg-glass-surface={variant}
      data-cg-elevation={String(elevation)}
      style={{
        ...variantCss,
        borderRadius: resolveRadius(radius),
        boxShadow,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  )
})
