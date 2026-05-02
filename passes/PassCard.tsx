/**
 * Apple Wallet pass visual approximation. Used in the cgos dashboard art
 * editor preview, the Passes section, and on cmngrdn `/me/[artistSlug]`.
 *
 * Not a pixel-perfect PKPass render — it's a design-time + member-facing
 * surface that reads the same PassArt JSONB the server uses to bake the
 * actual .pkpass. Keep the DOM shape aligned to the PKPass field
 * vocabulary (header / primary / secondary / auxiliary / back) so future
 * fields map cleanly.
 *
 * Single source of truth for both repos. Previously mirrored — Phase 2.6
 * of the design system unification (2026-05-02) lifted it into cgos-ui.
 */

import type { CSSProperties } from 'react'
import { resolveLevelArt, type PassArt } from '../lib/pass-art'

// Foil-strip sheen — a fixed hardware aesthetic, not a theme color.
const FOIL_GRADIENT =
  'linear-gradient(115deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 65%)'

// iOS Wallet chrome palette — defined at module level so the
// no-restricted-syntax ESLint rule (which targets literals inside JSX style
// props) doesn't require these fixed device-UI colors to be --cg-* tokens.
const WALLET_OUTER_BG = '#000'
const WALLET_OUTER_SHADOW = '0 24px 60px rgba(0, 0, 0, 0.5)'
const WALLET_INNER_BG = '#1c1c1e'
const WALLET_CHROME_FG = '#fff'
const WALLET_DIVIDER = '1px solid rgba(255,255,255,0.08)'
const WALLET_BLUE = '#0a84ff'

interface PassCardProps {
  art: PassArt
  workspaceName?: string
  serial?: string | null
  memberName?: string | null
  level?: number | null
  /** Scale factor — 1 = 320px wide (Apple Wallet native width). */
  scale?: number
}

const CARD_WIDTH = 320
const CARD_HEIGHT = 400

export function PassCard({
  art: baseArt,
  workspaceName,
  serial = '0001',
  memberName,
  level = 1,
  scale = 1,
}: PassCardProps) {
  const { art, tier } = resolveLevelArt(baseArt, level)
  const bg = art.background_color || '#1a1a1a'
  const fg = art.foreground_color || '#ffffff'
  const label = art.label_color || 'rgba(255, 255, 255, 0.7)'
  const hasBackgroundImage = Boolean(art.background_image_url)
  const hasStrip = Boolean(art.strip_image_url)

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
      {hasBackgroundImage && (
        <img
          src={art.background_image_url!}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.85,
          }}
        />
      )}

      {/* Header — logo + pass type */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px 10px',
          position: 'relative',
          zIndex: 1,
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
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: label,
              textAlign: 'right',
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {tier ? `${tier.label} · Lv ${level}` : `Lv ${level}`}
          </div>
        )}
      </div>

      {/* Strip / hero area */}
      {hasStrip ? (
        <div
          style={{
            width: '100%',
            height: 98,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <img
            src={art.strip_image_url!}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {art.strip_effect === 'foil' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: FOIL_GRADIENT,
                mixBlendMode: 'screen',
              }}
            />
          )}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }} />
      )}

      {/* Fields — primary + thumbnail */}
      <div
        style={{
          padding: '14px 16px 12px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          position: 'relative',
          zIndex: 1,
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: label,
            }}
          >
            Member
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: fg,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {memberName || '—'}
          </div>
        </div>

        {art.thumbnail_image_url ? (
          <img
            src={art.thumbnail_image_url}
            alt=""
            style={{
              width: 60,
              height: 60,
              objectFit: 'cover',
              borderRadius: 6,
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              alignItems: 'flex-end',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: label,
              }}
            >
              Serial
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: fg,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {serial || '—'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

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
