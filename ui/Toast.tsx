'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './IconButton'

/**
 * Toast — transient, self-dismissing status notification. The atom the
 * system was missing (there was no toast anywhere across the ecosystem);
 * every "saved" / "sent" / "copied" / "something failed" moment hand-rolled
 * its own inline banner or, worse, said nothing.
 *
 * Usage — mount ONE `<ToastProvider>` near the app root, then call the
 * `useToast()` hook anywhere beneath it:
 *
 *   // app root
 *   <ToastProvider><App /></ToastProvider>
 *
 *   // any component
 *   const { toast } = useToast()
 *   toast({ title: 'Transmission sent', tone: 'success' })
 *   toast({ title: 'Save failed', description: 'Check your connection.', tone: 'danger' })
 *
 * Items enter with a slide+fade (`cg-toast-in`), auto-dismiss after
 * `duration` ms (default 4500; pass `0` to make it sticky), and animate out
 * (`cg-toast-out`) before unmounting — the per-item `leaving` state keeps
 * them mounted for the exit, the same pattern Modal uses via usePresence.
 * Reduced motion collapses both directions to instant. Portal-rendered to
 * `document.body`, bottom-right, above modals; the container is
 * pointer-events-transparent so toasts never block clicks in the gaps.
 *
 * Companion keyframes + the reduced-motion guard live in `base.css`
 * (`cg-toast-in` / `cg-toast-out` / `[data-cg-toast]`), auto-loaded via
 * `cgos-ui/index.css`.
 */

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export interface ToastOptions {
  title: string
  /** Optional secondary line. */
  description?: string
  /** Accent color + a11y role. Default 'info'. */
  tone?: ToastTone
  /** Auto-dismiss delay, ms. `0` = sticky (dismiss only via the ✕). Default 4500. */
  duration?: number
}

interface ToastRecord extends Required<Omit<ToastOptions, 'description'>> {
  id: number
  description?: string
  /** Playing its exit animation, about to unmount. */
  leaving: boolean
}

interface ToastApi {
  /** Show a toast. Returns its id (pass to `dismiss` to close early). */
  toast: (opts: ToastOptions) => number
  /** Dismiss a specific toast now (plays the exit animation). */
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** Exit animation duration — in lockstep with the `cg-toast-out` keyframe. */
const EXIT_MS = 180
const DEFAULT_DURATION = 4500

const TONE_COLOR: Record<ToastTone, string> = {
  info: 'var(--cg-status-blue)',
  success: 'var(--cg-status-success)',
  warning: 'var(--cg-status-warning)',
  danger: 'var(--cg-status-danger)',
}

/** ARIA live politeness — errors assert, everything else is polite. */
const TONE_ROLE: Record<ToastTone, 'status' | 'alert'> = {
  info: 'status',
  success: 'status',
  warning: 'status',
  danger: 'alert',
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  /**
   * Whether we are past hydration, and therefore allowed to portal.
   *
   * `typeof document !== 'undefined'` is the obvious guard and the wrong one:
   * it is false while the server renders and true on the client's FIRST
   * render, which is the render React reconciles against the server's HTML. So
   * the server sends no viewport, the client's hydration pass has one, and
   * every SSR'd app mounting this provider throws "Hydration failed because
   * the server rendered HTML didn't match the client" — with a diff pointing
   * at a `<div aria-live="polite">` nobody wrote, which is not a fun thing to
   * chase (cmngrdn `/hq/*` carried it as an unexplained intermittent error).
   *
   * A state flag set in an effect is false for BOTH the server render and the
   * hydrating render, so the two agree; the viewport appears on the commit
   * after. Nothing is lost by the one-frame delay — the region is empty until
   * something calls `toast()`, which cannot happen before hydration anyway.
   */
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const nextId = useRef(1)
  // Pending auto-dismiss + removal timers, keyed by toast id, cleared on unmount.
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>[]>>(new Map())

  const clearTimers = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) {
      t.forEach(clearTimeout)
      timers.current.delete(id)
    }
  }, [])

  const remove = useCallback(
    (id: number) => {
      clearTimers(id)
      setToasts(prev => prev.filter(t => t.id !== id))
    },
    [clearTimers],
  )

  const dismiss = useCallback(
    (id: number) => {
      const exitMs = prefersReducedMotion() ? 0 : EXIT_MS
      setToasts(prev =>
        prev.map(t => (t.id === id ? { ...t, leaving: true } : t)),
      )
      const timer = setTimeout(() => remove(id), exitMs)
      const existing = timers.current.get(id) ?? []
      timers.current.set(id, [...existing, timer])
    },
    [remove],
  )

  const toast = useCallback(
    (opts: ToastOptions): number => {
      const id = nextId.current++
      const record: ToastRecord = {
        id,
        title: opts.title,
        description: opts.description,
        tone: opts.tone ?? 'info',
        duration: opts.duration ?? DEFAULT_DURATION,
        leaving: false,
      }
      setToasts(prev => [...prev, record])
      if (record.duration > 0) {
        const timer = setTimeout(() => dismiss(id), record.duration)
        timers.current.set(id, [timer])
      }
      return id
    },
    [dismiss],
  )

  // Clear every outstanding timer if the provider itself unmounts.
  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach(list => list.forEach(clearTimeout))
      map.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            style={{
              position: 'fixed',
              bottom: 'var(--cg-space-lg, 20px)',
              right: 'var(--cg-space-lg, 20px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--cg-space-sm, 10px)',
              zIndex: 1300,
              pointerEvents: 'none',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            {toasts.map(t => (
              <ToastItem key={t.id} record={t} onClose={() => dismiss(t.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

/** Access the toast API. Throws if no `<ToastProvider>` is mounted above. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>')
  }
  return ctx
}

function ToastItem({
  record,
  onClose,
}: {
  record: ToastRecord
  onClose: () => void
}) {
  const { title, description, tone, leaving } = record
  const color = TONE_COLOR[tone]
  return (
    <div
      data-cg-toast=""
      role={TONE_ROLE[tone]}
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--cg-space-sm, 10px)',
        width: 360,
        maxWidth: '100%',
        padding: 'var(--cg-space-md, 14px)',
        background: 'var(--cg-glass-bg-strong)',
        border: '1px solid var(--cg-glass-border-strong)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 'var(--cg-radius-md)',
        boxShadow: 'var(--cg-elev-4)',
        WebkitBackdropFilter: 'var(--cg-glass-blur-strong)',
        backdropFilter: 'var(--cg-glass-blur-strong)',
        animation: leaving
          ? `cg-toast-out ${EXIT_MS}ms var(--cg-ease-exit) forwards`
          : 'cg-toast-in 200ms var(--cg-ease-entry)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 8,
          height: 8,
          marginTop: 5,
          borderRadius: '50%',
          background: color,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cg-text-headline" style={{ margin: 0 }}>
          {title}
        </div>
        {description && (
          <div
            className="cg-text-small"
            style={{ marginTop: 2, color: 'var(--cg-text-secondary)' }}
          >
            {description}
          </div>
        )}
      </div>
      <IconButton
        icon={<CloseIcon />}
        label="Dismiss"
        onClick={onClose}
        variant="ghost"
        size="sm"
      />
    </div>
  )
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  )
}
