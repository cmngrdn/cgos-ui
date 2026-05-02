import {
  forwardRef,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
  type Ref,
} from 'react'

/**
 * Button — the canonical text-action atom for the Common Garden ecosystem.
 *
 * Aesthetic reference: cmngrdn's polished, token-driven, tactile feel.
 * See `docs/button-atom-brief.md` in the cgos repo for the full visual brief.
 *
 * Variants:
 *  - primary — accent fill, high-contrast text. Submit, Save, in-flow CTAs.
 *  - ghost   — surface fill + hairline border. Cancel, secondary toggles.
 *  - accent  — outlined accent. Connect, Promote, soft CTAs.
 *  - danger  — outlined destructive. Delete, Disconnect.
 *  - link    — bare accent text, no fill. Inline secondary actions.
 *  - glass   — frosted floating surface. Use for buttons that float over
 *              content (CGActionButton-style, hero overlays, mobile sheets).
 *
 * Sizes:
 *  - xs (24px) — chip-internal × close, dense table affordance
 *  - sm (32px) — inspector toolbars, table row actions
 *  - md (40px) — default; dashboard CTAs, settings, in-flow forms
 *  - lg (48px) — hero CTAs (booking submit, post-submit confirm)
 *
 * Pass `href` to render as `<a>`; otherwise renders `<button type="button">`.
 *
 * Companion CSS at `cgos-ui/ui/Button.css` is required for pseudo-state styling
 * (hover, active, focus, disabled, loading). It's included automatically when
 * consumers import `cgos-ui/index.css`.
 */

export type ButtonVariant = 'primary' | 'ghost' | 'accent' | 'danger' | 'link' | 'glass'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

type BaseProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  /** Glass-only modifier — opt into circular shape (e.g. CGActionButton). */
  pill?: boolean
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

type AsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & { href?: undefined }
type AsAnchor = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & { href: string }

export type ButtonProps = AsButton | AsAnchor

const SPINNER_SIZE: Record<ButtonSize, number> = { xs: 10, sm: 12, md: 14, lg: 16 }

function Spinner({ size }: { size: ButtonSize }) {
  const dim = SPINNER_SIZE[size]
  return (
    <span
      data-cg-button-spinner-wrapper=""
      aria-hidden="true"
    >
      <span
        data-cg-button-spinner=""
        style={{
          width: dim,
          height: dim,
          borderWidth: dim <= 12 ? 1.5 : 2,
        }}
      />
    </span>
  )
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      iconLeft,
      iconRight,
      pill = false,
      children,
      className,
      style,
      ...rest
    } = props

    const dataAttrs = {
      'data-cg-button': '',
      'data-variant': variant,
      'data-size': size,
      ...(fullWidth ? { 'data-full-width': '' } : {}),
      ...(loading ? { 'data-loading': '' } : {}),
      ...(pill && variant === 'glass' ? { 'data-pill': '' } : {}),
    }

    const inner = (
      <>
        {iconLeft ? (
          <span data-cg-button-icon="" aria-hidden="true">
            {iconLeft}
          </span>
        ) : null}
        {children !== undefined && children !== null ? (
          <span data-cg-button-label="">{children}</span>
        ) : null}
        {iconRight ? (
          <span data-cg-button-icon="" aria-hidden="true">
            {iconRight}
          </span>
        ) : null}
        {loading ? <Spinner size={size} /> : null}
      </>
    )

    if ('href' in rest && rest.href !== undefined) {
      const { href, ...anchorRest } = rest as AsAnchor
      return (
        <a
          ref={ref as Ref<HTMLAnchorElement>}
          href={loading ? undefined : href}
          aria-disabled={loading || undefined}
          className={className}
          style={style}
          {...dataAttrs}
          {...anchorRest}
        >
          {inner}
        </a>
      )
    }

    const { disabled, type, ...buttonRest } = rest as Omit<AsButton, 'href'>
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type={type ?? 'button'}
        disabled={disabled || loading}
        className={className}
        style={style}
        {...dataAttrs}
        {...buttonRest}
      >
        {inner}
      </button>
    )
  },
)
