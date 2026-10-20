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
 * Styling lives in `ui/GlassSurface.css` (imported by `cgos-ui/index.css`),
 * keyed off `data-cg-glass-surface` / `data-cg-elevation` / `data-cg-radius`,
 * so a consumer stylesheet can theme it (U2). Until v0.80.0 it styled itself
 * inline and no stylesheet could reach it.
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

const RADIUS_PRESETS: readonly GlassRadius[] = ['sm', 'md', 'lg', 'pill']

function isPreset(radius: GlassRadius | string): radius is GlassRadius {
  return (RADIUS_PRESETS as readonly string[]).includes(radius)
}

export const GlassSurface = forwardRef<HTMLElement, GlassSurfaceProps>(function GlassSurface(
  {
    variant = 'frosted',
    elevation = 2,
    radius = 'md',
    tintColor,
    as: Tag = 'div',
    style,
    children,
    ...rest
  },
  ref,
) {
  // The resting state is ui/GlassSurface.css, keyed off these attributes.
  // Only per-instance VALUES travel inline, as custom properties a consumer
  // rule can still override: a non-preset radius and a tint colour.
  const preset = isPreset(radius)
  const vars: Record<string, string> = {}
  if (!preset) vars['--cg-glass-surface-radius'] = radius
  if (variant === 'tinted' && tintColor) vars['--cg-glass-tint'] = tintColor
  const merged = Object.keys(vars).length || style ? ({ ...vars, ...style } as CSSProperties) : undefined
  return (
    <Tag
      ref={ref as Ref<HTMLElement> as Ref<HTMLDivElement>}
      data-cg-glass-surface={variant}
      data-cg-elevation={String(elevation)}
      data-cg-radius={preset ? radius : undefined}
      style={merged}
      {...rest}
    >
      {children}
    </Tag>
  )
})
