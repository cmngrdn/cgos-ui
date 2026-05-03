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
 *   sm — 32px tall, 12px font (filter-row, dense chrome)
 *   md — 40px tall, 14px font (default — most form fields)
 *
 * Visual: same background + border + focus treatment as Input atom; the
 * disclosure caret is a CSS background-image so it renders consistently
 * across browsers (Safari's native caret is misaligned with our padding).
 */

export type SelectSize = 'sm' | 'md'

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: SelectSize
  children?: ReactNode
}

const SIZE_TOKENS: Record<SelectSize, { padding: string; fontSize: string; height: string }> = {
  sm: { padding: '0 1.75rem 0 0.625rem', fontSize: '0.75rem', height: '32px' },
  md: { padding: '0 2rem 0 0.875rem', fontSize: '0.875rem', height: '40px' },
}

// Inline SVG chevron (theme-aware via currentColor — but inline SVG can't
// use CSS vars in url(). Hardcode neutral grey + tune per theme via the
// border-color cue around it.
const CHEVRON_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="%238a8880" stroke-width="2" stroke-linecap="round"><polyline points="3 4.5 6 7.5 9 4.5"/></svg>'

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = 'md', style, disabled, children, ...rest },
  ref,
) {
  const sizeStyle = SIZE_TOKENS[size]
  return (
    <select
      ref={ref}
      data-cg-select=""
      disabled={disabled}
      style={{
        width: '100%',
        height: sizeStyle.height,
        padding: sizeStyle.padding,
        background: `var(--cg-bg) url("${CHEVRON_SVG}") no-repeat right 0.625rem center`,
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
  )
})
