import { type CSSProperties, type ReactNode } from 'react'
import { ArrowsInSimple, ArrowsOutSimple, X } from '@phosphor-icons/react'
import { IconButton } from './IconButton'
import { appColor, type AppId } from '../lib/apps'

/**
 * A RECORD WINDOW'S HEAD (cgos `docs/hq-system.md` R4–R6, R12). An entity —
 * an inquiry, a booking, a person, a project — opens as its own window; this
 * is the card at its top. Three rows, one subject each, so every record's
 * head is one height without padding:
 *
 *   [face]  Title ······································ [expand][close]
 *           context — what it is, its parent as a link
 *           details — when, how long, its particulars ······ saved · STATUS
 *
 * - Tinted in its HOME app's colour (R5): an inquiry in Offerings gold, a
 *   booking Bookings blue, a person Audience pink, a project Library orange.
 *   The head's text keeps two colours: the status and the parent link.
 * - The status is alone, bottom right (R6); the saved state sits beside it (R12).
 * - Expand and close sit inside the head card, top right (R6).
 * - Next is NOT here: it is the first lit chip of the record's bar (R8).
 * - `progress` is the thin line hugging the card's bottom edge, only for a
 *   record with a real completeness to measure.
 *
 * Visual shell only; the consumer passes the controls' handlers.
 */
export interface RecordWindowHeadProps {
  /** the home app — its colour tints the head */
  app?: AppId
  /** a tint that is not an app's (a CSS var); ignored when `app` is set */
  color?: string
  /** the face: a circle for a person, a rounded square for a thing, a day tile for a date (L4) */
  face?: ReactNode
  title: ReactNode
  /** what it is and where it lives — a parent said in place as a link */
  context?: ReactNode
  /** its particulars */
  details?: ReactNode
  /** the status, bottom right */
  status?: ReactNode
  /** the autosave state, beside the status (R12) */
  saved?: ReactNode
  expand?: { on: boolean; onToggle: () => void }
  onClose?: () => void
  closeLabel?: string
  /** how complete the record is, 0–1, and the words a hover and a screen reader hear */
  progress?: { value: number; title: string }
  /** a narrow card: 40px face, 15px title */
  compact?: boolean
  className?: string
}

export function RecordWindowHead({
  app,
  color,
  face,
  title,
  context,
  details,
  status,
  saved,
  expand,
  onClose,
  closeLabel = 'Close',
  progress,
  compact,
  className,
}: RecordWindowHeadProps) {
  const tint = app ? appColor(app) : color
  const v = progress ? Math.max(0, Math.min(1, progress.value)) : 0
  return (
    <div
      data-cg-record-head=""
      data-cg-app={app}
      data-tinted={tint ? '' : undefined}
      data-compact={compact || undefined}
      className={className}
      style={tint ? ({ '--cg-record-app': tint } as CSSProperties) : undefined}
    >
      {face && <span data-cg-record-face="">{face}</span>}
      <span data-cg-record-title="">{title}</span>
      {(expand || onClose) && (
        <span data-cg-record-controls="">
          {expand && (
            <IconButton
              icon={expand.on ? <ArrowsInSimple /> : <ArrowsOutSimple />}
              label={expand.on ? 'Collapse — bring the others back' : 'Expand'}
              size="md"
              variant="subtle"
              active={expand.on}
              onClick={expand.onToggle}
            />
          )}
          {onClose && <IconButton icon={<X />} label={closeLabel} size="md" variant="subtle" onClick={onClose} />}
        </span>
      )}
      {context && <span data-cg-record-context="">{context}</span>}
      {details && <span data-cg-record-details="">{details}</span>}
      {(status || saved) && (
        <span data-cg-record-status="">
          {saved && <span data-cg-record-saved="">{saved}</span>}
          {status}
        </span>
      )}
      {progress && (
        <span
          data-cg-record-progress=""
          data-done={v >= 1 || undefined}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(v * 100)}
          aria-label={progress.title}
          title={progress.title}
          style={{ '--cg-record-progress': v } as CSSProperties}
        />
      )}
    </div>
  )
}
