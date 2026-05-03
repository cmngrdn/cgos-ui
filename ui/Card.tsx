import { forwardRef, type HTMLAttributes, type ReactNode, type Ref } from 'react'

/**
 * Card — semantic React wrapper around the .cg-card / .cg-card-interactive
 * utility classes (cgos-ui v0.16.0+).
 *
 * Use when JSX ergonomics matter (`<Card variant="interactive">` reads
 * better than `<div className="cg-card-interactive">`); use the utility
 * class directly when you're already chaining other classNames or wrapping
 * a non-div element with constraints.
 *
 * Variants:
 *   resting     — glass background + rim highlight, no hover/press behavior
 *                 (default). Wraps `.cg-card`. Use for static content panels.
 *   interactive — adds hover lift (translateY(-2px) + elev-1 → elev-3 +
 *                 brighter border), press snap-back, focus-visible accent
 *                 ring. Wraps `.cg-card-interactive`. Use for clickable
 *                 tiles. Pair with `as="button"` (or pass `onClick` and let
 *                 the consumer make it a button).
 *
 * Polymorphism: pass `as` for semantic HTML. Defaults to 'div'. Common
 * choices: 'article' for content, 'section' for groupings, 'button' for
 * interactive cards (auto-includes appearance/font/color resets via inline
 * style — same pattern OverviewSection's stat cards use).
 *
 * Don't use with `style={{ all: 'unset' }}` — `all: unset` is the most-
 * specific reset and will wipe the className-derived background/border/
 * shadow. Use targeted resets (appearance/font/color) instead.
 */

export type CardVariant = 'resting' | 'interactive'
export type CardElement = 'div' | 'article' | 'section' | 'aside' | 'button'

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'style'> {
  variant?: CardVariant
  as?: CardElement
  className?: string
  style?: React.CSSProperties
  children?: ReactNode
}

const VARIANT_CLASS: Record<CardVariant, string> = {
  resting: 'cg-card',
  interactive: 'cg-card-interactive',
}

// Button-element resets — needed when as='button' so the className-derived
// glass surface isn't wiped by browser defaults.
const BUTTON_RESETS: React.CSSProperties = {
  appearance: 'none',
  font: 'inherit',
  color: 'inherit',
  textAlign: 'left',
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { variant = 'resting', as: Tag = 'div', className, style, children, ...rest },
  ref,
) {
  const classes = [VARIANT_CLASS[variant], className].filter(Boolean).join(' ')
  const composedStyle: React.CSSProperties =
    Tag === 'button' ? { ...BUTTON_RESETS, ...style } : { ...style }

  return (
    <Tag
      ref={ref as Ref<HTMLElement> as Ref<HTMLDivElement>}
      className={classes}
      style={composedStyle}
      {...rest}
    >
      {children}
    </Tag>
  )
})
