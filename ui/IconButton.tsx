import {
  forwardRef,
  type ReactNode,
  type CSSProperties,
  type ButtonHTMLAttributes,
  type Ref,
} from 'react'

/**
 * IconButton — the icon-only action atom for toolbars, headers, and chip
 * close buttons. Replaces every ad-hoc `<button style={{ all: 'unset' }}>`
 * with an icon inside.
 *
 * Variants:
 *  - ghost (default) — transparent bg, muted fg, hover lifts to text + raise
 *  - subtle          — same hover behavior, slightly stronger default fg
 *  - accent          — accent fg, accent-tinted hover bg
 *  - danger          — danger fg, danger-tinted hover bg
 *
 * Sizes:
 *  - xs (16px) — chip-internal × close, dense table affordance.
 *                Skips the hover background lift — at 16×16 the tint reads
 *                too heavy. Hover is color-swap only.
 *  - sm (24px) — table row actions, inline controls
 *  - md (32px) — default; toolbars, inspector headers
 *  - lg (40px) — hero icon actions
 *
 * `label` is required and becomes both `aria-label` and the default `title`.
 * Pass `active` to toggle the pressed/selected appearance + `aria-pressed`.
 *
 * Companion CSS at `cgos-ui/ui/IconButton.css` is required for pseudo-state
 * styling (hover, active, focus, disabled). Auto-loaded via `cgos-ui/index.css`.
 */

export type IconButtonVariant = 'ghost' | 'subtle' | 'accent' | 'danger'
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  active?: boolean
  className?: string
  style?: CSSProperties
}

export type { IconButtonProps }

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      label,
      variant = 'ghost',
      size = 'md',
      active = false,
      title,
      type,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type={type ?? 'button'}
        aria-label={label}
        aria-pressed={active || undefined}
        title={title ?? label}
        data-cg-icon-button=""
        data-variant={variant}
        data-size={size}
        {...(active ? { 'data-active': '' } : {})}
        className={className}
        style={style}
        {...rest}
      >
        <span data-cg-icon-button-icon="" aria-hidden="true">
          {icon}
        </span>
      </button>
    )
  },
)
