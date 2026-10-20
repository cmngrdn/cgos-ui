import { type CSSProperties, type ReactNode } from 'react'
import { ArrowsOutSimple, X } from '@phosphor-icons/react'
import { IconButton } from './IconButton'
import { appColor, type AppId } from '../lib/apps'

/**
 * THE STUB — an app folded beside a record that took the room, in the app's
 * colour top to bottom (cgos `docs/hq-system.md` R3, S1). Tapping it is Back:
 * the app comes back beside the record. Its quick controls sit at the
 * bottom, always visible; the app's stub has no close (an app cannot be
 * closed), a folded record's may.
 */
export interface StubProps {
  app?: AppId
  /** a colour for a stub that is not an app's (a folded record); ignored when `app` is set */
  color?: string
  /** the app's chip, or the record's face */
  icon?: ReactNode
  label: string
  onBack: () => void
  onExpand?: () => void
  onClose?: () => void
  /** a dot: the list behind it is narrowed */
  narrowed?: boolean
  className?: string
}

export function Stub({ app, color, icon, label, onBack, onExpand, onClose, narrowed, className }: StubProps) {
  const tint = app ? appColor(app) : color
  return (
    <div
      data-cg-stub=""
      data-cg-app={app}
      data-tinted={tint ? '' : undefined}
      className={className}
      style={tint ? ({ '--cg-stub-app': tint } as CSSProperties) : undefined}
    >
      <button type="button" data-cg-stub-back="" onClick={onBack} title={`Back to ${label}`} aria-label={`Back to ${label}`}>
        {icon && (
          <span data-cg-stub-icon="">
            {icon}
            {narrowed && <span data-cg-stub-badge="" aria-label="narrowed" />}
          </span>
        )}
        <span data-cg-stub-label="">{label}</span>
      </button>
      {(onExpand || onClose) && (
        <span data-cg-stub-acts="">
          {onExpand && <IconButton icon={<ArrowsOutSimple />} label={`Expand ${label}`} size="md" variant="subtle" onClick={onExpand} />}
          {onClose && <IconButton icon={<X />} label={`Close ${label}`} size="md" variant="subtle" onClick={onClose} />}
        </span>
      )}
    </div>
  )
}
