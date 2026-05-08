import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { IconButton } from '../ui/IconButton'
import { MobileFrame } from './MobileFrame'
import { DesktopFrame } from './DesktopFrame'

/**
 * DevicePreview v2 — viewport-aware preview chrome.
 *
 * Two named exports, disjoint props (replaces v1's
 * single-component-with-EITHER-url-OR-children API):
 *
 *   - <DeviceIframePreview url="…" />          renders an iframe inside the
 *     device chrome. Slow — a parent save needs to call `ref.current.refresh()`
 *     (or click the toolbar reload) to bump a key and reload the iframe.
 *
 *   - <DeviceSubtreePreview>{...}</DeviceSubtreePreview>   renders arbitrary
 *     React children inside the device chrome. Instant — driven by props,
 *     no iframe, no reload. Preferred for in-context editors.
 *
 * Both share:
 *   - Mobile chrome via `MobileFrame` (iPhone 15 Pro silhouette, 393×852pt;
 *     Safari URL pill in iframe variant).
 *   - Desktop chrome via `DesktopFrame` (browser window, max-width 1280px).
 *   - Default viewport: mobile.
 *   - Viewport prop is controlled OR uncontrolled. Pass `viewport` to control;
 *     omit it and pass `defaultViewport` for an initial value.
 *   - Optional `onViewportChange` fires for both modes.
 *
 * Phase 4 (Expo) note: subtree variant is the native-portable one — RN has
 * no `<iframe>` (use a `WebView`-shimmed leaf if you truly need URL preview).
 */

export type DevicePreviewViewport = 'mobile' | 'desktop'

export interface DeviceIframePreviewHandle {
  /** Bump the iframe key, forcing a reload. Use after a parent save. */
  refresh: () => void
}

interface ViewportControlProps {
  /** Controlled viewport. When provided, the component reflects this value. */
  viewport?: DevicePreviewViewport
  /** Initial viewport in uncontrolled mode. Defaults to `'mobile'`. */
  defaultViewport?: DevicePreviewViewport
  /** Fires whenever the user clicks a viewport pill (controlled + uncontrolled). */
  onViewportChange?: (viewport: DevicePreviewViewport) => void
}

export interface DeviceIframePreviewProps extends ViewportControlProps {
  /** URL to render in the iframe. Required. */
  url: string
  /** iframe `title` attribute (a11y). Defaults to "Preview". */
  title?: string
}

export interface DeviceSubtreePreviewProps extends ViewportControlProps {
  /** React content to render inside the device chrome. Required. */
  children: ReactNode
}

const DEFAULT_VIEWPORT: DevicePreviewViewport = 'mobile'
const DESKTOP_MAX_WIDTH = 1280
const DESKTOP_MIN_HEIGHT = 600

/* ------------------------------------------------------------------ *
 *  DeviceIframePreview — iframe variant                               *
 * ------------------------------------------------------------------ */

export const DeviceIframePreview = forwardRef<
  DeviceIframePreviewHandle,
  DeviceIframePreviewProps
>(function DeviceIframePreview(
  { url, title = 'Preview', viewport, defaultViewport, onViewportChange },
  ref,
) {
  const [refreshKey, setRefreshKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const refresh = () => setRefreshKey(k => k + 1)

  useImperativeHandle(
    ref,
    () => ({
      refresh,
    }),
    [],
  )

  const renderFrame = (vp: DevicePreviewViewport) => {
    const iframe = (
      <iframe
        key={refreshKey}
        ref={iframeRef}
        src={url}
        title={title}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          background: 'transparent',
        }}
      />
    )
    return vp === 'mobile' ? (
      <MobileFrame safariUrl={url}>{iframe}</MobileFrame>
    ) : (
      <DesktopFrameWrapper>
        <DesktopFrame browserUrl={url}>{iframe}</DesktopFrame>
      </DesktopFrameWrapper>
    )
  }

  return (
    <DevicePreviewShell
      viewport={viewport}
      defaultViewport={defaultViewport}
      onViewportChange={onViewportChange}
      onRefresh={refresh}
      renderFrame={renderFrame}
    />
  )
})

/* ------------------------------------------------------------------ *
 *  DeviceSubtreePreview — React children variant                      *
 * ------------------------------------------------------------------ */

export function DeviceSubtreePreview({
  children,
  viewport,
  defaultViewport,
  onViewportChange,
}: DeviceSubtreePreviewProps) {
  const renderFrame = (vp: DevicePreviewViewport) =>
    vp === 'mobile' ? (
      <MobileFrame>{children}</MobileFrame>
    ) : (
      <DesktopFrameWrapper>
        <DesktopFrame>{children}</DesktopFrame>
      </DesktopFrameWrapper>
    )

  return (
    <DevicePreviewShell
      viewport={viewport}
      defaultViewport={defaultViewport}
      onViewportChange={onViewportChange}
      renderFrame={renderFrame}
    />
  )
}

/* ------------------------------------------------------------------ *
 *  Internal: shared chrome (toolbar + frame container)                *
 * ------------------------------------------------------------------ */

interface DevicePreviewShellProps {
  viewport?: DevicePreviewViewport
  defaultViewport?: DevicePreviewViewport
  onViewportChange?: (viewport: DevicePreviewViewport) => void
  /** When provided, the toolbar shows a reload button that calls this. */
  onRefresh?: () => void
  renderFrame: (viewport: DevicePreviewViewport) => ReactNode
}

function DevicePreviewShell({
  viewport,
  defaultViewport,
  onViewportChange,
  onRefresh,
  renderFrame,
}: DevicePreviewShellProps) {
  const isControlled = viewport !== undefined
  const [internalViewport, setInternalViewport] = useState<DevicePreviewViewport>(
    defaultViewport ?? DEFAULT_VIEWPORT,
  )
  const currentViewport = isControlled ? viewport : internalViewport

  const handleViewport = (vp: DevicePreviewViewport) => {
    if (!isControlled) setInternalViewport(vp)
    onViewportChange?.(vp)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--cg-bg)',
      }}
    >
      <Toolbar
        viewport={currentViewport}
        onChange={handleViewport}
        onRefresh={onRefresh}
      />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: currentViewport === 'mobile' ? 'hidden' : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: currentViewport === 'mobile' ? '20px 16px' : '20px',
        }}
      >
        {renderFrame(currentViewport)}
      </div>
    </div>
  )
}

function Toolbar({
  viewport,
  onChange,
  onRefresh,
}: {
  viewport: DevicePreviewViewport
  onChange: (vp: DevicePreviewViewport) => void
  onRefresh?: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        borderBottom: '1px solid var(--cg-border)',
        background: 'var(--cg-bg-elevated)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '2px',
          background: 'var(--cg-bg)',
          borderRadius: '6px',
          padding: '2px',
        }}
      >
        <ViewportPill viewport="mobile" current={viewport} label="Mobile" onClick={onChange} />
        <ViewportPill viewport="desktop" current={viewport} label="Desktop" onClick={onChange} />
      </div>
      {onRefresh && (
        <IconButton
          icon={<span style={{ fontSize: '14px', lineHeight: 1 }}>↻</span>}
          label="Reload preview"
          size="sm"
          variant="subtle"
          onClick={onRefresh}
        />
      )}
    </div>
  )
}

function ViewportPill({
  viewport,
  current,
  label,
  onClick,
}: {
  viewport: DevicePreviewViewport
  current: DevicePreviewViewport
  label: string
  onClick: (vp: DevicePreviewViewport) => void
}) {
  const active = viewport === current
  return (
    <button
      type="button"
      onClick={() => onClick(viewport)}
      style={{
        all: 'unset',
        padding: '4px 12px',
        fontSize: '11px',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--cg-text)' : 'var(--cg-text-secondary)',
        background: active ? 'var(--cg-bg-surface)' : 'transparent',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function DesktopFrameWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: `${DESKTOP_MAX_WIDTH}px`,
        height: '100%',
        minHeight: `${DESKTOP_MIN_HEIGHT}px`,
      }}
    >
      {children}
    </div>
  )
}
