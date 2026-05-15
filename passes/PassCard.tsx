/**
 * Apple Wallet pass visual approximation. Used in the cgos dashboard art
 * editor preview, the Passes section, and on cmngrdn `/me/[artistSlug]`.
 *
 * Honest layout (matches storeCard rendering, May 2026):
 *   • Header  → logo + level chip
 *   • Strip   → sharp banner (the dominant visual)
 *   • Primary → MEMBER + member name
 *   • Sec     → WORLD + LEVEL row
 *   • Aux     → PASS # row
 *   • QR      → bottom block, fixed black-on-white per Apple constraint
 *   • altText → small mono caption under the QR
 *
 * Non-customizable per Apple PassKit:
 *   • barcode color (always black on white)
 *   • barcode placement (Apple decides — bottom of front for QR)
 *   • barcode frame (none — sits on a fixed white tile)
 *   • barcode size (Apple sizes it; we approximate at ~140px)
 *
 * The taller card height (520) reflects iOS storeCard with QR present —
 * artists need to see how much real estate the QR occupies so they
 * design strip/colors around it.
 *
 * Single source of truth for both repos.
 */

import type { CSSProperties } from 'react'
import type { PassArt } from '../lib/pass-art'

// iOS Wallet chrome palette — module-level so the no-restricted-syntax
// ESLint rule (which targets literals inside JSX style props) doesn't
// require these fixed device-UI colors to be --cg-* tokens.
const WALLET_OUTER_BG = '#000'
const WALLET_OUTER_SHADOW = '0 24px 60px rgba(0, 0, 0, 0.5)'
const WALLET_INNER_BG = '#1c1c1e'
const WALLET_CHROME_FG = '#fff'
const WALLET_DIVIDER = '1px solid rgba(255,255,255,0.08)'
const WALLET_BLUE = '#0a84ff'

// Barcode hardware constants — Apple enforces all of these.
const BARCODE_BG = '#ffffff'
const BARCODE_FG = '#000000'
const BARCODE_SIZE = 140

interface PassCardProps {
  art: PassArt
  workspaceName?: string
  serial?: string | null
  memberName?: string | null
  level?: number | null
  /** Scale factor — 1 = 320px wide (Apple Wallet native width). */
  scale?: number
  /**
   * Barcode + altText below it. When omitted, no barcode tile renders
   * (use this if a pass deliberately ships without one). Default: shows
   * a placeholder QR tile so artists see how much room it occupies.
   */
  barcodeAltText?: string | null
  /** Set false to hide the barcode entirely (rare — most passes ship one). */
  showBarcode?: boolean
}

const CARD_WIDTH = 320
const CARD_HEIGHT = 520

export function PassCard({
  art,
  workspaceName,
  serial = '0001',
  memberName,
  level = 1,
  scale = 1,
  barcodeAltText,
  showBarcode = true,
}: PassCardProps) {
  const bg = art.background_color || '#1a1a1a'
  const fg = art.foreground_color || '#ffffff'
  const label = art.label_color || 'rgba(255, 255, 255, 0.7)'
  const hasStrip = Boolean(art.strip_image_url)

  const altText =
    barcodeAltText ??
    (workspaceName ? `${workspaceName.toUpperCase()} #${serial ?? '0001'}` : null)

  const rootStyle: CSSProperties = {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 14,
    background: bg,
    color: fg,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
    transform: scale === 1 ? undefined : `scale(${scale})`,
    transformOrigin: 'top left',
  }

  return (
    <div style={rootStyle}>
      {/* Header — logo (top-left) + LEVEL header field (top-right).
          Mirrors pass.json `headerFields` rendering position. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '14px 16px 10px',
          position: 'relative',
          zIndex: 1,
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {art.logo_image_url ? (
            <img
              src={art.logo_image_url}
              alt=""
              style={{ height: 22, maxWidth: 140, objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: fg,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {art.logo_text || workspaceName || 'MEMBER PASS'}
            </div>
          )}
        </div>
        {level !== null && (
          <FieldBlock
            label="LV"
            value={String(level)}
            fg={fg}
            labelColor={label}
            align="right"
            compact
          />
        )}
      </div>

      {/* Strip / hero area */}
      {hasStrip && (
        <div
          style={{
            width: '100%',
            height: 110,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <img
            src={art.strip_image_url!}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Fields below strip — secondaryFields row (MEMBER, left) +
          auxiliaryFields row (PASS #, right-aligned). primaryFields kept
          EMPTY in pass.json so the strip stays clean. WORLD field
          intentionally dropped — logoText already shows workspace name
          in the top-left corner. */}
      <div
        style={{
          padding: '12px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <FieldBlock
          label="MEMBER"
          value={memberName || '—'}
          fg={fg}
          labelColor={label}
        />
        <FieldBlock
          label="PASS"
          value={`#${serial || '0001'}`}
          fg={fg}
          labelColor={label}
          align="right"
        />
      </div>

      {/* Barcode — fixed black-on-white per Apple, sits on a white tile */}
      {showBarcode && (
        <div
          style={{
            marginTop: 'auto',
            padding: '10px 0 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              background: BARCODE_BG,
              padding: 8,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarcodePlaceholder />
          </div>
          {altText && (
            <div
              style={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                fontSize: 9,
                color: fg,
                opacity: 0.8,
                letterSpacing: '0.05em',
              }}
            >
              {altText}
            </div>
          )}
        </div>
      )}

      {/* Thumbnail (small accent right of barcode area) — only if set + not
          competing with the QR tile. Kept off when showBarcode=true; iOS
          favors the barcode there. */}
      {!showBarcode && art.thumbnail_image_url && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            width: 60,
            height: 60,
          }}
        >
          <img
            src={art.thumbnail_image_url}
            alt=""
            style={{
              width: 60,
              height: 60,
              objectFit: 'cover',
              borderRadius: 6,
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Field block helper ─────────────────────────────────────────────────────

interface FieldBlockProps {
  label: string
  value: string
  fg: string
  labelColor: string
  align?: 'left' | 'right'
  large?: boolean
  /** Smaller variant for header-field rendering (top-right LV chip). */
  compact?: boolean
}

function FieldBlock({ label, value, fg, labelColor, align = 'left', large, compact }: FieldBlockProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minWidth: 0,
        textAlign: align,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontSize: compact ? 8 : 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: labelColor,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: large ? 18 : compact ? 11 : 13,
          fontWeight: 600,
          color: fg,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
    </div>
  )
}

// ── Barcode placeholder ────────────────────────────────────────────────────
// SVG that visually approximates a QR code at the right size — three corner
// registration markers + a deterministic noise grid. Renders in the same
// space as the actual QR Apple bakes into the .pkpass, so the artist can
// design around its footprint.

function BarcodePlaceholder() {
  const cells = 21 // matches typical QR module count for short URLs
  const cellSize = (BARCODE_SIZE - 16) / cells

  // Deterministic pseudo-noise pattern for the data area — same every render
  // so the preview doesn't flicker when the artist tweaks colors.
  const noise: boolean[][] = []
  for (let y = 0; y < cells; y++) {
    const row: boolean[] = []
    for (let x = 0; x < cells; x++) {
      // Skip corner registration zones (7×7 at top-left, top-right, bottom-left)
      const inTL = x < 7 && y < 7
      const inTR = x >= cells - 7 && y < 7
      const inBL = x < 7 && y >= cells - 7
      if (inTL || inTR || inBL) {
        row.push(false)
        continue
      }
      // Pseudo-random but stable based on position
      row.push(((x * 31 + y * 17 + 13) % 7) < 3)
    }
    noise.push(row)
  }

  function CornerMarker({ cx, cy }: { cx: number; cy: number }) {
    return (
      <g>
        <rect x={cx} y={cy} width={cellSize * 7} height={cellSize * 7} fill={BARCODE_FG} />
        <rect
          x={cx + cellSize}
          y={cy + cellSize}
          width={cellSize * 5}
          height={cellSize * 5}
          fill={BARCODE_BG}
        />
        <rect
          x={cx + cellSize * 2}
          y={cy + cellSize * 2}
          width={cellSize * 3}
          height={cellSize * 3}
          fill={BARCODE_FG}
        />
      </g>
    )
  }

  return (
    <svg
      width={BARCODE_SIZE - 16}
      height={BARCODE_SIZE - 16}
      viewBox={`0 0 ${BARCODE_SIZE - 16} ${BARCODE_SIZE - 16}`}
      style={{ display: 'block' }}
    >
      {/* Data cells */}
      {noise.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill={BARCODE_FG}
            />
          ) : null,
        ),
      )}
      {/* Corner registration markers */}
      <CornerMarker cx={0} cy={0} />
      <CornerMarker cx={(cells - 7) * cellSize} cy={0} />
      <CornerMarker cx={0} cy={(cells - 7) * cellSize} />
    </svg>
  )
}

// ── Wallet-chrome wrapper ──────────────────────────────────────────────────

interface PassCardInWalletProps extends PassCardProps {
  /** Show the card inside a simplified iPhone Wallet chrome (status bar, done button). */
  showWalletFrame?: boolean
}

/**
 * PassCard with the iPhone Wallet frame — status bar, title, done button.
 * Use for the "this is what your members will see" preview.
 */
export function PassCardInWallet({ showWalletFrame = true, ...props }: PassCardInWalletProps) {
  if (!showWalletFrame) return <PassCard {...props} />

  return (
    <div
      style={{
        width: 360,
        background: WALLET_OUTER_BG,
        borderRadius: 36,
        padding: 12,
        boxShadow: WALLET_OUTER_SHADOW,
      }}
    >
      <div
        style={{
          background: WALLET_INNER_BG,
          borderRadius: 28,
          padding: '12px 16px 20px',
          color: WALLET_CHROME_FG,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        }}
      >
        {/* Faux wallet chrome — title row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 4px 14px',
            borderBottom: WALLET_DIVIDER,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600 }}>Passes</span>
          <span style={{ fontSize: 15, color: WALLET_BLUE, fontWeight: 500 }}>Done</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PassCard {...props} />
        </div>
      </div>
    </div>
  )
}
