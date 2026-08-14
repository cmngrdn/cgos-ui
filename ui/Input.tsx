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
 * **STYLING LIVES IN `Input.css`, NOT INLINE (changed 2026-08-14).** These
 * atoms used to set their resting state in a React `style` attribute, and this
 * docblock used to offer that as the override mechanism. Inline works for a
 * per-instance override written in JS — and it makes stylesheet theming
 * impossible, because an inline declaration beats any selector at any
 * specificity. A consumer could not restyle these controls at all; cmngrdn's
 * inspector had to reach for `!important` to soften twenty bordered field boxes.
 *
 * So the static declarations moved to `Input.css`, keyed off the
 * `[data-cg-input]` / `[data-cg-textarea]` attributes these elements already
 * carried — the same shape `Button` uses with `[data-cg-button]`. Size became
 * `data-cg-size`; disabled became `:disabled`. Both are now things a selector
 * can see.
 *
 * `style` still merges last and still wins. What changed is that a stylesheet
 * now works too. **Anything visual added here belongs in the CSS file** — if a
 * new prop needs to affect appearance, express it as a data attribute and style
 * it there, or the next consumer hits the same wall.
 *
 * Requires `cgos-ui/index.css` (which imports `Input.css`) — without it these
 * render unstyled rather than half-styled, which is the honest failure mode.
 */

export type InputSize = 'sm' | 'md'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', style, disabled, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      data-cg-input=""
      data-cg-size={size}
      disabled={disabled}
      style={style}
      {...rest}
    />
  )
})

/**
 * Textarea — multi-line text input atom.
 *
 * Same visual treatment as Input but for `<textarea>`. `rows` defaults to 3.
 * No size variant — `rows` controls vertical sizing; padding stays md.
 *
 * Styling lives in `Input.css`; see the Input docblock above for why.
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
      style={style}
      {...rest}
    />
  )
})
