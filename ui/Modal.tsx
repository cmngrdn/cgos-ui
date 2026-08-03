import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './IconButton'
import { usePresence } from './usePresence'

/**
 * Modal — centered dialog atom with a glass-frosted backdrop, scroll-lock,
 * click-outside close, and Esc close.
 *
 * Replaces ad-hoc centered overlays. The right-side inspector is a
 * different primitive (InspectorDrawer) — don't use Modal for persistent
 * inspector panels. Bottom sheets use MobileActionSheet.
 *
 * Sizes target content width: sm=420 / md=640 (default) / lg=880 / xl=1120.
 *
 * Visual upgrade in Phase 2.3 (cgos-ui v0.9.0): backdrop now layers a
 * `backdrop-filter: blur(...)` on top of the `--cg-backdrop` tint —
 * matching the Liquid Glass material vocabulary. Surface stays solid
 * (`--cg-bg-elevated`) for legibility — modals are MODAL, not floating.
 *
 * Enter/exit keyframes (`cg-modal-*`) live in `cgos-ui/base.css`, auto-loaded
 * via `cgos-ui/index.css`; everything else is inline-style. The close button's
 * focus ring comes from the IconButton atom.
 *
 * Accessibility: on open, focus moves into the dialog and is trapped (Tab /
 * Shift-Tab cycle within it); on close, focus returns to the element that had
 * it. The dialog is named by its `title` (via aria-labelledby) or, when
 * titleless, by the `ariaLabel` prop.
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  /** Disable backdrop/Esc close (use for destructive confirmations). */
  dismissible?: boolean
  /** Render without the default padded body wrapper — caller controls padding. */
  bare?: boolean
  /** Accessible name when there's no visible `title`. Ignored when `title` is
   *  set (the title labels the dialog then). Defaults to "Dialog". */
  ariaLabel?: string
}

// Elements that can receive keyboard focus — used to scope the Tab trap and to
// pick the initial focus target inside the dialog.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

const MAX_WIDTH: Record<ModalSize, number> = { sm: 420, md: 640, lg: 880, xl: 1120 }

/** Exit animation duration — kept in lockstep with usePresence's unmount
 * delay and the `cg-modal-*-out` keyframes below. */
const EXIT_MS = 160

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dismissible = true,
  bare = false,
  ariaLabel,
}: ModalProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  // The element focused before the dialog opened, restored on close.
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // Esc to close + scroll-lock + focus management + Tab trap while open.
  useEffect(() => {
    if (!open) return

    // Remember what had focus, then move focus into the dialog. Without this,
    // keyboard focus stays behind the modal (WCAG 2.4.3) — the whole point of a
    // modal is that it's the only thing interactable while up.
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const surface = surfaceRef.current
    const firstFocusable = surface?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    ;(firstFocusable ?? surface)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !surface) return
      // Recompute each Tab so dynamic dialog content is handled. Skip elements
      // that aren't actually rendered (display:none etc).
      const nodes = Array.from(
        surface.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.getClientRects().length > 0)
      if (nodes.length === 0) {
        // Nothing focusable inside — keep focus on the surface itself.
        e.preventDefault()
        surface.focus()
        return
      }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === first || !surface.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !surface.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      // Return focus to whatever triggered the dialog.
      const toRestore = restoreFocusRef.current
      if (toRestore && typeof toRestore.focus === 'function') toRestore.focus()
    }
  }, [open, dismissible, onClose])

  // Stay mounted through the exit animation, then unmount. `open` drives the
  // enter vs. exit keyframes; `mounted` gates whether we render at all.
  /** Did this click's pointer-down land on the backdrop itself? A selection
   *  drag that starts in a field and ends outside must not dismiss. */
  const downOnBackdrop = useRef(false)

  const mounted = usePresence(open, EXIT_MS)
  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : (ariaLabel ?? 'Dialog')}
      // Dismiss on the backdrop only when the gesture BEGAN there.
      //
      // `onClick` alone is wrong and the failure is nasty: select the text in a
      // field and drag past the edge of the panel, and the browser fires
      // `click` on the nearest common ancestor of the down and up targets —
      // the backdrop — so the dialog vanishes mid-selection taking whatever was
      // typed with it. Reported on the staffing paste dialog, where the name
      // field is the first thing anyone edits.
      //
      // Tracking the pointer-down target fixes the whole class: a drag that
      // starts inside can never dismiss, and a genuine backdrop click still
      // does. Pointer events rather than mouse, so it holds for touch drags too.
      onPointerDown={e => {
        downOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={
        dismissible
          ? e => {
              if (downOnBackdrop.current && e.target === e.currentTarget) onClose()
            }
          : undefined
      }
      data-cg-modal-backdrop=""
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--cg-backdrop)',
        WebkitBackdropFilter: 'blur(8px) saturate(140%)',
        backdropFilter: 'blur(8px) saturate(140%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--cg-space-lg)',
        zIndex: 1200,
        animation: open
          ? 'cg-modal-fade 150ms var(--cg-ease)'
          : `cg-modal-fade-out ${EXIT_MS}ms var(--cg-ease-exit) forwards`,
      }}
    >
      <div
        ref={surfaceRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        data-cg-modal-surface=""
        style={{
          width: '100%',
          maxWidth: MAX_WIDTH[size],
          maxHeight: 'calc(100vh - 2 * var(--cg-space-lg))',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cg-bg-elevated)',
          border: '1px solid var(--cg-border)',
          borderRadius: 'var(--cg-radius-lg)',
          boxShadow: 'var(--cg-elev-4)',
          overflow: 'hidden',
          animation: open
            ? 'cg-modal-rise 180ms var(--cg-ease)'
            : `cg-modal-rise-out ${EXIT_MS}ms var(--cg-ease-exit) forwards`,
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--cg-space-md) var(--cg-space-lg)',
              borderBottom: '1px solid var(--cg-border)',
              flexShrink: 0,
            }}
          >
            <h2 id={titleId} className="cg-text-title" style={{ margin: 0 }}>
              {title}
            </h2>
            {dismissible && (
              <IconButton
                icon={<CloseIcon />}
                label="Close"
                onClick={onClose}
                variant="ghost"
                size="sm"
              />
            )}
          </div>
        )}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: bare ? 0 : 'var(--cg-space-lg)',
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--cg-space-sm)',
              padding: 'var(--cg-space-md) var(--cg-space-lg)',
              borderTop: '1px solid var(--cg-border)',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  )
}
