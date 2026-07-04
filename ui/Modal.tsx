import { useEffect, type ReactNode } from 'react'
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
 * Companion CSS at `cgos-ui/ui/Modal.css` carries the focus-visible ring
 * for the close button only — everything else is inline-style. Auto-loaded
 * via `cgos-ui/index.css`.
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
}

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
}: ModalProps) {
  // Esc to close + scroll-lock while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, dismissible, onClose])

  // Stay mounted through the exit animation, then unmount. `open` drives the
  // enter vs. exit keyframes; `mounted` gates whether we render at all.
  const mounted = usePresence(open, EXIT_MS)
  if (!mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={dismissible ? onClose : undefined}
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
            <h2 className="cg-text-title" style={{ margin: 0 }}>
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
