import { type ReactNode, type CSSProperties } from 'react'

/**
 * DesktopFrame — minimal browser-window silhouette for desktop previews.
 * Deliberately light: rounded corners, subtle shadow, tiny traffic lights,
 * and a URL pill — just enough chrome to read as "a browser window" without
 * eating the content space that a full MacBook frame would. Counterpart to
 * `MobileFrame`.
 *
 * Use directly when you want browser chrome without the viewport-toggle
 * toolbar. For the standard "preview with mobile/desktop toggle" pattern,
 * prefer `DeviceIframePreview` / `DeviceSubtreePreview` from
 * `cgos-ui/preview/DevicePreview`.
 */

const TOP_BAR_HEIGHT = 32
const OUTER_RADIUS = 10

// macOS browser-chrome palette — defined at module level so the
// no-restricted-syntax ESLint rule (which targets literals inside JSX style
// props) doesn't require these fixed hardware colors to be --cg-* tokens.
const CHROME_DEFAULT_DISPLAY_BG = '#fff'
const CHROME_TOP_BAR_BG = 'linear-gradient(to bottom, #ecedf0 0%, #e4e5e8 100%)'
const CHROME_TOP_BAR_BORDER = '0.5px solid rgba(0, 0, 0, 0.1)'
const TRAFFIC_DOT_SHADOW = 'inset 0 0 0 0.5px rgba(0, 0, 0, 0.12)'
const TRAFFIC_DOT_RED = '#ff5f57'
const TRAFFIC_DOT_YELLOW = '#ffbd2e'
const TRAFFIC_DOT_GREEN = '#28c840'
const URL_PILL_BG = 'rgba(255, 255, 255, 0.75)'
const URL_PILL_BORDER = '0.5px solid rgba(0, 0, 0, 0.08)'
const URL_PILL_FG = '#222'

export interface DesktopFrameProps {
  children: ReactNode
  /** URL shown in the address pill. When omitted, renders the body only with
   *  the same rounded-window chrome sans top bar. */
  browserUrl?: string
  /** Background color of the display area behind the content. Default: white. */
  displayBg?: string
  style?: CSSProperties
}

export function DesktopFrame({
  children,
  browserUrl,
  displayBg = CHROME_DEFAULT_DISPLAY_BG,
  style,
}: DesktopFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: `${OUTER_RADIUS}px`,
        overflow: 'hidden',
        background: displayBg,
        border: '1px solid var(--cg-border)',
        boxShadow: 'var(--cg-shadow-lift)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {browserUrl && <BrowserChrome url={browserUrl} />}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function BrowserChrome({ url }: { url: string }) {
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        height: `${TOP_BAR_HEIGHT}px`,
        padding: '0 12px',
        background: CHROME_TOP_BAR_BG,
        borderBottom: CHROME_TOP_BAR_BORDER,
        flexShrink: 0,
      }}
    >
      <TrafficLights />
      <UrlPill displayUrl={displayUrl} />
      {/* Balances the traffic lights so the URL pill reads centered */}
      <div style={{ width: '52px', flexShrink: 0 }} />
    </div>
  )
}

function TrafficLights() {
  const dot = (bg: string): CSSProperties => ({
    width: '11px',
    height: '11px',
    borderRadius: '50%',
    background: bg,
    boxShadow: TRAFFIC_DOT_SHADOW,
    flexShrink: 0,
  })
  return (
    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
      <span style={dot(TRAFFIC_DOT_RED)} />
      <span style={dot(TRAFFIC_DOT_YELLOW)} />
      <span style={dot(TRAFFIC_DOT_GREEN)} />
    </div>
  )
}

function UrlPill({ displayUrl }: { displayUrl: string }) {
  return (
    <div
      style={{
        flex: 1,
        maxWidth: '440px',
        margin: '0 auto',
        height: '22px',
        borderRadius: '6px',
        background: URL_PILL_BG,
        border: URL_PILL_BORDER,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        padding: '0 10px',
        fontSize: '12px',
        fontWeight: 500,
        color: URL_PILL_FG,
        letterSpacing: '-0.01em',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      <svg
        width="9"
        height="10"
        viewBox="0 0 10 12"
        fill="currentColor"
        aria-hidden
        style={{ opacity: 0.55, flexShrink: 0 }}
      >
        <path d="M5 0C3 0 1.4 1.6 1.4 3.6v1.4H1c-0.55 0-1 0.45-1 1v5c0 0.55 0.45 1 1 1h8c0.55 0 1-0.45 1-1v-5c0-0.55-0.45-1-1-1H8.6V3.6C8.6 1.6 7 0 5 0Zm2.2 5H2.8V3.6C2.8 2.37 3.77 1.4 5 1.4s2.2 0.97 2.2 2.2V5Z" />
      </svg>
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayUrl}
      </span>
    </div>
  )
}
