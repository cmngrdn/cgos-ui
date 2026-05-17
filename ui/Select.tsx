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

export type SelectSize = 'sm' | 'md'

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: SelectSize
  children?: ReactNode
}

const SIZE_TOKENS: Record<
  SelectSize,
  { padding: string; fontSize: string; height: string; chevronSize: number; chevronRight: string }
> = {
  sm: {
    padding: '0 1.75rem 0 0.625rem',
    fontSize: '0.75rem',
    height: '32px',
    chevronSize: 12,
    chevronRight: '0.5rem',
  },
  md: {
    padding: '0 2rem 0 0.875rem',
    fontSize: '0.875rem',
    height: '40px',
    chevronSize: 14,
    chevronRight: '0.625rem',
  },
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
        disabled={disabled}
        style={{
          width: '100%',
          height: sizeStyle.height,
          padding: sizeStyle.padding,
          background: 'var(--cg-bg)',
          border: '1px solid var(--cg-border)',
          borderRadius: 'var(--cg-radius-md)',
          color: 'var(--cg-text)',
          fontFamily: 'var(--cg-font)',
          fontSize: sizeStyle.fontSize,
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 'var(--cg-disabled-opacity)' : 1,
          transition: 'border-color var(--cg-duration-fast) var(--cg-ease)',
          boxSizing: 'border-box',
          ...style,
        }}
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
