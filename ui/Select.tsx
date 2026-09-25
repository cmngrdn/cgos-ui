import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'

/**
 * Select — native <select> dropdown atom with consistent styling.
 *
 * For chip-style multi-option dropdowns, prefer ChipSelect (portal-rendered
 * menu, glass surface, full keyboard nav). This atom is for situations where
 * a native <select> is the right call: long option lists, mobile-friendly
 * native picker UX, simple form fields.
 *
 * Sizes:
 *   chip — 28px tall, 12px font, 12px chevron — sits in a row of ControlChips
 *          and reads their token (v0.71.0)
 *   sm — 32px tall, 12px font, 12px chevron (filter-row, dense chrome)
 *   md — 40px tall, 14px font, 14px chevron (default — most form fields)
 *
 * Visual: same background + border + focus treatment as Input atom. The
 * disclosure chevron is an overlay <svg> element (not a CSS background-image)
 * so it can use `currentColor` and stays theme-aware across light/dark
 * workspaces. The wrapper <span> is `display: block, width: 100%, position:
 * relative` so it matches the inner select's flex/sizing behavior; the SVG is
 * absolutely positioned with `pointer-events: none` so clicks still open the
 * native picker.
 */

export type SelectSize = 'chip' | 'sm' | 'md'

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: SelectSize
  children?: ReactNode
}

/** What still varies by size in code: the chevron. Height, padding and corner
 *  are CSS (`Select.css`) since v0.76.0. */
const SIZE_TOKENS: Record<SelectSize, { chevronSize: number; chevronRight: string }> = {
  chip: { chevronSize: 12, chevronRight: '0.5rem' },
  sm: { chevronSize: 12, chevronRight: '0.5rem' },
  md: { chevronSize: 14, chevronRight: '0.625rem' },
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', style, disabled, children, ...rest },
  ref,
) {
  const sizeStyle = SIZE_TOKENS[size]
  return (
    <span
      data-cg-select-wrapper=""
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
      }}
    >
      <select
        ref={ref}
        data-cg-select=""
        data-cg-size={size}
        disabled={disabled}
        // RESTING STYLES LIVE IN `Select.css` since v0.76.0, not here. They were
        // inline, and an inline style is the one thing no stylesheet can
        // outrank: a consumer that needed a 26px select in a 26px column, or a
        // borderless one in a table of rates, had to reach for `!important`
        // (cmngrdn staffing, two places). `style` still passes through for a
        // one-off.
        style={style}
        {...rest}
      >
        {children}
      </select>
      <SelectChevron size={sizeStyle.chevronSize} right={sizeStyle.chevronRight} />
    </span>
  )
})

function SelectChevron({ size, right }: { size: number; right: string }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-cg-select-chevron=""
      style={{
        position: 'absolute',
        right,
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: 'var(--cg-text-secondary)',
      }}
    >
      <polyline points="3.5,5.5 7,9 10.5,5.5" />
    </svg>
  )
}
