import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

/**
 * Input — single-line text input atom.
 *
 * Replaces `.weave-input` className uses + the inline textfield styles
 * scattered across both repos. Standardizes:
 *   - background var(--cg-bg) (matches dashboard's input convention)
 *   - 1px hairline border, accent-dim on focus
 *   - --cg-radius-md, font/size from theme
 *   - var(--cg-disabled-opacity) when disabled
 *
 * Sizes:
 *   sm — 32px tall, 12px font (filter-row inputs, dense chrome)
 *   md — 40px tall, 14px font (default — most form inputs)
 *
 * Variants are not exposed yet; theme-tuning happens via the underlying
 * `--cg-*` tokens. If a callsite needs a different size or visual treatment,
 * pass `style` to override per-instance — the inline style merges on top of
 * the className-derived defaults (don't use `all: unset`).
 */

export type InputSize = 'sm' | 'md'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize
}

const SIZE_TOKENS: Record<InputSize, { padding: string; fontSize: string }> = {
  sm: { padding: '0.375rem 0.625rem', fontSize: '0.75rem' },
  md: { padding: '0.625rem 0.875rem', fontSize: '0.875rem' },
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', style, disabled, ...rest },
  ref,
) {
  const sizeStyle = SIZE_TOKENS[size]
  return (
    <input
      ref={ref}
      data-cg-input=""
      disabled={disabled}
      style={{
        width: '100%',
        padding: sizeStyle.padding,
        background: 'var(--cg-bg)',
        border: '1px solid var(--cg-border)',
        borderRadius: 'var(--cg-radius-md)',
        color: 'var(--cg-text)',
        fontFamily: 'var(--cg-font)',
        fontSize: sizeStyle.fontSize,
        outline: 'none',
        transition: 'border-color var(--cg-duration-fast) var(--cg-ease)',
        opacity: disabled ? 'var(--cg-disabled-opacity)' : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    />
  )
})

/**
 * Textarea — multi-line text input atom.
 *
 * Same visual treatment as Input but for `<textarea>`. `rows` defaults to 3.
 * No size variant — `rows` controls vertical sizing; padding stays md.
 */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** No size variant — use `rows` to control vertical sizing. */
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { style, disabled, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      data-cg-textarea=""
      disabled={disabled}
      rows={rows}
      style={{
        width: '100%',
        padding: '0.625rem 0.875rem',
        background: 'var(--cg-bg)',
        border: '1px solid var(--cg-border)',
        borderRadius: 'var(--cg-radius-md)',
        color: 'var(--cg-text)',
        fontFamily: 'var(--cg-font)',
        fontSize: '0.875rem',
        lineHeight: 1.5,
        outline: 'none',
        resize: 'vertical',
        transition: 'border-color var(--cg-duration-fast) var(--cg-ease)',
        opacity: disabled ? 'var(--cg-disabled-opacity)' : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    />
  )
})
