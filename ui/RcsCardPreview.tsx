'use client'

/**
 * RcsCardPreview — what an RCS phone draws for a `twilio/card` message.
 *
 * Image, title, text, then the buttons as chips. Presentational only: the
 * caller hands it a card (`cgos-ui/lib/rcs-card`) and it draws it.
 *
 * THE IMAGE IS CROPPED THE WAY THE PHONE CROPS IT. Google centre-crops card
 * media to a fixed height (SHORT 112dp · MEDIUM 168dp · TALL 264dp), so this
 * box has that height's ratio to the card width and the image fills it with
 * `object-fit: cover`. Showing the whole image would preview a picture the
 * recipient never sees.
 *
 * It is a DEPICTION of a phone's card, so it belongs inside a preview frame
 * (an iPhone frame, a thread), never as a surface in an inspector rail.
 * Resting state lives in `RcsCardPreview.css`, keyed off `data-cg-rcs-card`.
 *
 * `embedded`: the card sits in a message stream that is already inside a
 * surface (an HQ SMS thread in the inspector rail). It drops to the fill tier
 * (no border, no elevated background) so it reads as one message among the
 * bubbles rather than a card inside a card.
 */

import { useState } from 'react'
import {
  RCS_CARD_DEFAULTS,
  type RcsButtonType,
  type RcsCard,
} from '../lib/rcs-card'

export interface RcsCardPreviewProps {
  card: Pick<RcsCard, 'media_url' | 'title' | 'body' | 'height' | 'orientation' | 'buttons'>
  /** Fill tier, for a card drawn inside a surface (a thread in a rail). */
  embedded?: boolean
  className?: string
}

function ButtonGlyph({ type }: { type: RcsButtonType }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (type === 'url') {
    return (
      <svg {...common}>
        <path d="M6 3H3v10h10v-3" />
        <path d="M9 2h5v5" />
        <path d="M14 2 7.5 8.5" />
      </svg>
    )
  }
  if (type === 'call') {
    return (
      <svg {...common}>
        <path d="M4.5 2h2l1 3-1.5 1a8 8 0 0 0 4 4l1-1.5 3 1v2A1.5 1.5 0 0 1 12.5 13 10.5 10.5 0 0 1 3 3.5 1.5 1.5 0 0 1 4.5 2Z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M6 4 2 8l4 4" />
      <path d="M2 8h8a4 4 0 0 1 4 4v1" />
    </svg>
  )
}

export function RcsCardPreview({ card, embedded, className }: RcsCardPreviewProps) {
  const media = (card.media_url ?? '').trim()
  // Keyed on the URL, so a new image gets a fresh chance to load.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const title = (card.title ?? '').trim()
  const body = (card.body ?? '').trim()
  const buttons = card.buttons ?? []

  return (
    <div
      data-cg-rcs-card=""
      data-cg-orientation={card.orientation ?? RCS_CARD_DEFAULTS.orientation}
      {...(embedded ? { 'data-cg-embedded': '' } : {})}
      className={className}
    >
      {media && (
        <div
          data-cg-rcs-card-media=""
          data-cg-height={card.height ?? RCS_CARD_DEFAULTS.height}
        >
          {failedUrl === media ? (
            <span data-cg-rcs-card-media-empty="">Image didn&apos;t load</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- a remote preview image of arbitrary origin; no optimiser
            <img src={media} alt="" loading="lazy" onError={() => setFailedUrl(media)} />
          )}
        </div>
      )}
      {(title || body) && (
        <div data-cg-rcs-card-text="">
          {title && <div data-cg-rcs-card-title="">{title}</div>}
          {body && <div data-cg-rcs-card-body="">{body}</div>}
        </div>
      )}
      {buttons.length > 0 && (
        <div data-cg-rcs-card-actions="">
          {buttons.map((b, i) => (
            <span key={`${b.id}-${i}`} data-cg-rcs-card-action="" data-cg-type={b.type}>
              <ButtonGlyph type={b.type} />
              <span data-cg-rcs-card-action-label="">{b.title.trim() || 'Button'}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
