import { useId, useState, type ReactNode, type CSSProperties } from 'react'

/**
 * Collapsible — header + smoothly-animated expand/collapse body atom.
 *
 * The body height animates via the `grid-template-rows: 0fr → 1fr` technique
 * (dependency-free, no JS height measurement). The animated wrapper carries
 * the `cg-collapsible-content` class so the base-css `prefers-reduced-motion`
 * guard can drop the transition.
 *
 * Controlled (`open` + `onOpenChange`) or uncontrolled (`defaultOpen`). The
 * `trigger` is always visible and toggles on click — pass a summary row + a
 * chevron. Built for the Pulse "collapsed strip above the list" pattern: a
 * one-line summary that opens to the full chart.
 *
 * Pure inline-style + one class hook. `.cg-text-*` typography from base.css.
 */

export interface CollapsibleProps {
  /** Always-visible header. Clicking it toggles the body. */
  trigger: ReactNode
  children: ReactNode
  /** Controlled open state. Omit for uncontrolled (use `defaultOpen`). */
  open?: boolean
  /** Initial open state when uncontrolled. Default false (collapsed). */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** aria-label for the trigger button. */
  label?: string
  style?: CSSProperties
}

export function Collapsible({
  trigger,
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  label,
  style,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const bodyId = useId()

  function toggle() {
    const next = !open
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div style={style}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={label}
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          cursor: 'pointer',
          outline: 'revert',
        }}
      >
        {trigger}
      </button>
      {/* grid 0fr→1fr animates height without measuring. The inner div clips
          overflow; the base.css reduced-motion guard drops the transition. */}
      <div
        id={bodyId}
        className="cg-collapsible-content"
        // eslint-disable-next-line no-restricted-syntax -- grid-rows collapse technique; no hex, tokens only
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows var(--cg-duration-base) var(--cg-ease)',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }} aria-hidden={!open}>
          {children}
        </div>
      </div>
    </div>
  )
}
