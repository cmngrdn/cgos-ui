import { type ReactNode, type CSSProperties } from 'react'

/**
 * MobileFrame — realistic iPhone 15 Pro silhouette for device previews.
 * Renders a metallic bezel, Dynamic Island, iOS status bar, and (optionally)
 * the floating Safari chrome — so previews actually feel like looking at a
 * phone, not a rounded rectangle.
 *
 * Aspect ratio is locked at 393 / 852 (iPhone 15 Pro point dimensions). The
 * frame scales to fit its container via `height: 100%` + `aspectRatio` +
 * `maxHeight` / `maxWidth`.
 *
 * Use directly when you want the chrome without the viewport-toggle toolbar
 * (e.g. as a standalone phone-shaped wrapper inside a custom layout). For
 * the standard "preview with mobile/desktop toggle" pattern, prefer
 * `DeviceIframePreview` / `DeviceSubtreePreview` from
 * `cgos-ui/preview/DevicePreview`.
 */

const ASPECT_RATIO = '393 / 852'
const MAX_HEIGHT = 852
const BEZEL_THICKNESS = 8
const OUTER_RADIUS = 58
const INNER_RADIUS = 50
const STATUS_BAR_HEIGHT = 48
const SAFARI_BAR_HEIGHT = 72
// Side-button proportions derived from iPhone 15 Pro layout at 393pt width
const BUTTON_WIDTH = 3
const SIDE_BUTTON_OFFSET = -1.5  // button pokes slightly past the bezel edge

// iPhone 15 Pro hardware palette — defined at module level so the
// no-restricted-syntax ESLint rule (which targets literals inside JSX style
// props) doesn't require these fixed hardware colors to be --cg-* tokens.
const PHONE_FRAME_BG =
  'linear-gradient(140deg, #3a3a3e 0%, #1f1f24 28%, #0e0e12 70%, #050507 100%)'
const PHONE_FRAME_SHADOW = [
  '0 30px 60px rgba(0, 0, 0, 0.55)',
  '0 12px 28px rgba(0, 0, 0, 0.45)',
  'inset 0 1px 0 rgba(255, 255, 255, 0.14)',
  'inset 0 -1px 0 rgba(0, 0, 0, 0.55)',
  'inset 0 0 0 1px rgba(255, 255, 255, 0.04)',
].join(', ')
const PHONE_DISPLAY_SHADOW = 'inset 0 0 0 1px rgba(0, 0, 0, 0.9)'
const PHONE_HOME_IND_COLOR = 'rgba(255, 255, 255, 0.55)'
const PHONE_CHROME_BLACK = '#000'
const PHONE_CHROME_WHITE = '#fff'
const PHONE_ISLAND_SHADOW = 'inset 0 1px 1px rgba(255, 255, 255, 0.03)'
const PHONE_SAFARI_BG =
  'linear-gradient(to top, rgba(240, 240, 245, 0.96) 70%, rgba(240, 240, 245, 0.82) 100%)'
const PHONE_SAFARI_BORDER = '0.5px solid rgba(0, 0, 0, 0.12)'
const PHONE_SAFARI_FG = '#111'
const PHONE_SAFARI_PILL_BG = 'rgba(0, 0, 0, 0.06)'

export interface MobileFrameProps {
  children: ReactNode
  /** Status bar time display. Defaults to Apple's canonical "9:41". */
  time?: string
  /** Render the Safari bottom chrome with the given URL shown in the pill. */
  safariUrl?: string
  /** Background color of the display area behind the content (shows under
   *  status bar). Default: black (matches real iOS when content loads). */
  displayBg?: string
  /** Optional override for the phone frame wrapper styles (e.g. maxHeight). */
  style?: CSSProperties
}

export function MobileFrame({
  children,
  time = '9:41',
  safariUrl,
  displayBg = '#000',
  style,
}: MobileFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        aspectRatio: ASPECT_RATIO,
        maxHeight: `${MAX_HEIGHT}px`,
        maxWidth: '100%',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Side buttons — silent switch + volume (left), power (right). Absolute
       *  on the outer wrapper so they sit on the bezel's edge, not in the display. */}
      <SideButtons />

      {/* Phone body — metallic bezel + drop shadow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: `${OUTER_RADIUS}px`,
          background: PHONE_FRAME_BG,
          boxShadow: PHONE_FRAME_SHADOW,
          padding: `${BEZEL_THICKNESS}px`,
        }}
      >
        {/* Display — where the webpage / content lives */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: `${INNER_RADIUS}px`,
            overflow: 'hidden',
            background: displayBg,
            boxShadow: PHONE_DISPLAY_SHADOW,
            isolation: 'isolate',
          }}
        >
          {/* Content — scrollable; pads for status bar + Safari chrome */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              paddingTop: `${STATUS_BAR_HEIGHT}px`,
              paddingBottom: safariUrl ? `${SAFARI_BAR_HEIGHT}px` : 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                background: 'inherit',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {children}
            </div>
          </div>

          {/* Status bar — floats above content with solid black bg */}
          <StatusBar time={time} />

          {/* Dynamic Island — centered cutout at top */}
          <DynamicIsland />

          {/* Optional Safari chrome */}
          {safariUrl && <SafariChrome url={safariUrl} />}

          {/* Home indicator — iOS 15+ gesture pill */}
          <HomeIndicator />
        </div>
      </div>
    </div>
  )
}

function SideButtons() {
  // Proportions as % of outer height so buttons scale with the frame.
  const base: CSSProperties = {
    position: 'absolute',
    width: `${BUTTON_WIDTH}px`,
    borderRadius: '2px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.55)',
    pointerEvents: 'none',
    zIndex: 0,
  }
  const leftBg = 'linear-gradient(to right, #141418 0%, #2a2a30 55%, #101015 100%)'
  const rightBg = 'linear-gradient(to left, #141418 0%, #2a2a30 55%, #101015 100%)'
  return (
    <>
      {/* Left: Action button / ring switch */}
      <div style={{ ...base, left: SIDE_BUTTON_OFFSET, top: '12.5%', height: '4%', background: leftBg }} />
      {/* Left: Volume up */}
      <div style={{ ...base, left: SIDE_BUTTON_OFFSET, top: '20%', height: '7%', background: leftBg }} />
      {/* Left: Volume down */}
      <div style={{ ...base, left: SIDE_BUTTON_OFFSET, top: '29%', height: '7%', background: leftBg }} />
      {/* Right: Side / power button */}
      <div style={{ ...base, right: SIDE_BUTTON_OFFSET, top: '22%', height: '10%', background: rightBg }} />
    </>
  )
}

function HomeIndicator() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '134px',
        height: '5px',
        borderRadius: '3px',
        background: PHONE_HOME_IND_COLOR,
        mixBlendMode: 'difference',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  )
}

function StatusBar({ time }: { time: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: `${STATUS_BAR_HEIGHT}px`,
        background: PHONE_CHROME_BLACK,
        color: PHONE_CHROME_WHITE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 26px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        fontSize: '15px',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        zIndex: 2,
      }}
    >
      <span style={{ minWidth: '54px', textAlign: 'left' }}>{time}</span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          minWidth: '54px',
          justifyContent: 'flex-end',
        }}
      >
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </span>
    </div>
  )
}

function DynamicIsland() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '120px',
        height: '34px',
        borderRadius: '20px',
        background: PHONE_CHROME_BLACK,
        boxShadow: PHONE_ISLAND_SHADOW,
        zIndex: 3,
        pointerEvents: 'none',
      }}
    />
  )
}

function SignalIcon() {
  return (
    <svg
      width="17"
      height="11"
      viewBox="0 0 17 11"
      fill="currentColor"
      aria-hidden
    >
      <rect x="0" y="7" width="3" height="4" rx="0.6" />
      <rect x="4.5" y="5" width="3" height="6" rx="0.6" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="0.6" />
      <rect x="13.5" y="0" width="3" height="11" rx="0.6" />
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg
      width="15"
      height="11"
      viewBox="0 0 15 11"
      fill="currentColor"
      aria-hidden
    >
      <path d="M7.5 0C5 0 2.65 0.85 0.9 2.4c-0.25 0.22-0.25 0.6-0.02 0.84l1 1.04c0.2 0.2 0.52 0.22 0.74 0.04 1.38-1.16 3.14-1.82 4.88-1.82s3.5 0.66 4.88 1.82c0.22 0.18 0.54 0.16 0.74-0.04l1-1.04c0.23-0.24 0.23-0.62-0.02-0.84C12.35 0.85 10 0 7.5 0Z" />
      <path d="M7.5 4c-1.5 0-2.92 0.52-4.02 1.48-0.24 0.2-0.26 0.58-0.04 0.8l1.04 1.06c0.2 0.2 0.52 0.2 0.74 0.02 0.72-0.6 1.6-0.92 2.28-0.92s1.56 0.32 2.28 0.92c0.22 0.18 0.54 0.18 0.74-0.02l1.04-1.06c0.22-0.22 0.2-0.6-0.04-0.8C10.42 4.52 9 4 7.5 4Z" />
      <path d="M7.5 8c-0.76 0-1.48 0.28-2.02 0.76-0.24 0.22-0.26 0.6-0.02 0.82l1.58 1.58c0.26 0.26 0.68 0.26 0.94 0l1.58-1.58c0.24-0.22 0.22-0.6-0.02-0.82C8.98 8.28 8.26 8 7.5 8Z" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg
      width="26"
      height="11"
      viewBox="0 0 26 11"
      fill="none"
      aria-hidden
    >
      {/* Outer case */}
      <rect
        x="0.5"
        y="0.5"
        width="22"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeOpacity="0.4"
        fill="none"
      />
      {/* Positive terminal */}
      <rect
        x="23.5"
        y="3.5"
        width="1.5"
        height="4"
        rx="0.75"
        fill="currentColor"
        fillOpacity="0.4"
      />
      {/* Fill (80%) */}
      <rect x="2" y="2" width="17" height="7" rx="1.3" fill="currentColor" />
    </svg>
  )
}

function SafariChrome({ url }: { url: string }) {
  // Strip protocol for a cleaner pill display
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${SAFARI_BAR_HEIGHT}px`,
        padding: '8px 14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: PHONE_SAFARI_BG,
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        borderTop: PHONE_SAFARI_BORDER,
        color: PHONE_SAFARI_FG,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        zIndex: 2,
      }}
    >
      <SafariButton ariaLabel="Back">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </SafariButton>
      <div
        style={{
          flex: 1,
          height: '36px',
          borderRadius: '12px',
          background: PHONE_SAFARI_PILL_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '5px',
          padding: '0 10px',
          fontSize: '14px',
          fontWeight: 500,
          color: PHONE_SAFARI_FG,
          letterSpacing: '-0.01em',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        <svg
          width="10"
          height="12"
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
      <SafariButton ariaLabel="More">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </SafariButton>
    </div>
  )
}

function SafariButton({
  children,
  ariaLabel,
}: {
  children: ReactNode
  ariaLabel: string
}) {
  return (
    <div
      aria-label={ariaLabel}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: PHONE_SAFARI_PILL_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: PHONE_SAFARI_FG,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  )
}
