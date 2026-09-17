'use client'

/**
 * MessageAttachment — one thing a text message carries besides words.
 *
 * Three shapes, one per KIND (`cgos-ui/lib/message-media` decides the kind):
 *   - `image`   — the picture itself, inline. Tap opens it large
 *                 (`AttachmentViewer`).
 *   - `contact` — a "Contact card" chip, with the contact's photo, name and
 *                 number when the caller has read them (`lib/vcard`).
 *   - `file`    — a file chip ("PDF · 2.1 MB").
 *
 * And four STATES, because a received file is copied into storage after the
 * message lands:
 *   - `ready`   — drawn as above.
 *   - `loading` — the caller is still fetching a link it can show; an image is
 *                 a quiet box of the same shape, so nothing jumps when it lands.
 *   - `pending` — the file hasn't been stored yet. Quiet: muted label, no
 *                 spinner, because it usually resolves in seconds and a
 *                 spinner in a conversation reads as a failure in progress.
 *   - `failed`  — the chip with a short note in the danger tone.
 *
 * An image that fails to LOAD (a signed link that expired, say) calls
 * `onImageError` once and falls back to the chip until the caller hands it a
 * new `src`. The atom never fetches: a bearer-authenticated link cannot be an
 * `<img src>`, so resolving one is the consumer's job.
 *
 * `onRemove` renders a × for an attachment that is still a DRAFT — on an
 * image it floats over the corner (IconButton `overlay`); on a chip it trails
 * the label as a SIBLING button, never nested inside the body.
 *
 * FILL TIER, never a card: an attachment sits inside a thread or a composer,
 * both of which are already the surface. Resting state lives in
 * `MessageAttachment.css`, keyed off `data-cg-attachment`.
 */

import { useState, type ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { IconButton } from './IconButton'
import type { AttachmentKind } from '../lib/message-media'

export type MessageAttachmentState = 'ready' | 'loading' | 'pending' | 'failed'

export interface MessageAttachmentProps {
  kind: AttachmentKind
  /** What it is: "Photo", "Contact card", "PDF", or a file name. Also the
   *  image's alt text. */
  label: string
  /** The second line: "Maya Lin · +1 612 555 0100", "2.1 MB", or why it
   *  failed. Ignored on a ready image. */
  detail?: string | null
  /** The picture (image), or the contact's photo (contact). */
  src?: string | null
  state?: MessageAttachmentState
  /** `md` in a thread (up to 240px), `sm` in a composer's draft strip (64px). */
  size?: 'sm' | 'md'
  /** Tap: view the picture large, or open the file. */
  onOpen?: () => void
  /** The image didn't load — usually an expired link. Called once per `src`. */
  onImageError?: () => void
  /** Renders a × — for a draft attachment only. */
  onRemove?: () => void
  removeLabel?: string
  className?: string
}

function Glyph({ kind, state }: { kind: AttachmentKind; state: MessageAttachmentState }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (state === 'failed') {
    return (
      <svg {...common}>
        <path d="M8 2.5 14.5 13.5h-13Z" />
        <path d="M8 6.5v3" />
        <path d="M8 11.6v.1" />
      </svg>
    )
  }
  if (kind === 'image') {
    return (
      <svg {...common}>
        <rect x="2" y="3" width="12" height="10" rx="1.5" />
        <circle cx="5.8" cy="6.4" r="1.1" />
        <path d="m2.5 12 3.8-3.6 2.6 2.3 1.8-1.6 2.8 2.6" />
      </svg>
    )
  }
  if (kind === 'contact') {
    return (
      <svg {...common}>
        <circle cx="8" cy="6" r="2.6" />
        <path d="M3 13.5c.8-2.4 2.7-3.6 5-3.6s4.2 1.2 5 3.6" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M4 1.8h5l3 3v9.4H4Z" />
      <path d="M9 1.8v3h3" />
      <path d="M6 8.5h4M6 11h4" />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M2 2l6 6M8 2 2 8" />
    </svg>
  )
}

export function MessageAttachment({
  kind,
  label,
  detail,
  src,
  state = 'ready',
  size = 'md',
  onOpen,
  onImageError,
  onRemove,
  removeLabel,
  className,
}: MessageAttachmentProps) {
  // Keyed on the URL, so a fresh link gets a fresh chance to load.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const source = (src ?? '').trim() || null
  const imageFailed = !!source && failedSrc === source
  const asPicture = kind === 'image' && state === 'ready' && !!source && !imageFailed
  const asPlaceholder = kind === 'image' && !asPicture && (state === 'loading' || state === 'pending')
    && size === 'md'
  const shape = asPicture || asPlaceholder ? 'thumb' : 'chip'

  const remove = onRemove ? (
    <IconButton
      size="sm"
      variant={shape === 'thumb' ? 'overlay' : 'ghost'}
      label={removeLabel ?? `Remove ${label}`}
      icon={<CloseGlyph />}
      onClick={onRemove}
      data-cg-attachment-remove=""
    />
  ) : null

  let body: ReactNode
  if (asPicture && source) {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element -- a message attachment of arbitrary origin; no optimiser
      <img
        src={source}
        alt={label}
        loading="lazy"
        onError={() => {
          setFailedSrc(source)
          onImageError?.()
        }}
      />
    )
    body = onOpen ? (
      <button type="button" data-cg-attachment-body="" onClick={onOpen} aria-label={`View ${label}`}>
        {img}
      </button>
    ) : (
      <span data-cg-attachment-body="">{img}</span>
    )
  } else if (asPlaceholder) {
    body = (
      <span data-cg-attachment-body="" role="img" aria-label={detail ? `${label}, ${detail}` : label}>
        <Glyph kind={kind} state={state} />
        <span data-cg-attachment-label="">{label}</span>
      </span>
    )
  } else {
    // A picture that can't be drawn still says what it is; a failed one says why.
    const thumb = kind === 'contact' && source && !imageFailed && state === 'ready' ? (
      // eslint-disable-next-line @next/next/no-img-element -- a contact card's own photo (data: or https)
      <img src={source} alt="" onError={() => setFailedSrc(source)} />
    ) : (
      <Glyph kind={kind} state={state} />
    )
    const secondary = imageFailed && kind === 'image' && !detail ? 'Tap to try again' : detail
    const content = (
      <>
        <span data-cg-attachment-thumb="">{thumb}</span>
        <span data-cg-attachment-text="">
          <span data-cg-attachment-label="">{label}</span>
          {secondary && <span data-cg-attachment-detail="">{secondary}</span>}
        </span>
      </>
    )
    // A picture that didn't load retries on tap (the caller may already have
    // handed over a fresh link); anything else opens.
    const tap = imageFailed
      ? () => setFailedSrc(null)
      : onOpen && state === 'ready'
        ? onOpen
        : null
    body = tap ? (
      <button type="button" data-cg-attachment-body="" onClick={tap}>
        {content}
      </button>
    ) : (
      <span data-cg-attachment-body="">{content}</span>
    )
  }

  return (
    <span
      data-cg-attachment=""
      data-cg-kind={kind}
      data-cg-state={imageFailed ? 'broken' : state}
      data-cg-shape={shape}
      data-cg-size={size}
      className={className}
    >
      {body}
      {remove}
    </span>
  )
}

export interface MessageAttachmentStripProps {
  /** `end` lines the strip up under an outbound bubble. */
  align?: 'start' | 'end'
  children: ReactNode
  className?: string
}

/** Lays attachments out in a wrapping row. */
export function MessageAttachmentStrip({ align = 'start', children, className }: MessageAttachmentStripProps) {
  return (
    <div data-cg-attachment-strip="" data-cg-align={align} className={className}>
      {children}
    </div>
  )
}

export interface AttachmentViewerProps {
  open: boolean
  onClose: () => void
  /** The picture, or null while its link is being fetched. */
  src: string | null
  label: string
  /** Offer "Open original" in a new tab. Defaults to `src`. */
  href?: string | null
}

/** A picture, large. Built on `Modal`, so Esc, backdrop and focus behave. */
export function AttachmentViewer({ open, onClose, src, label, href }: AttachmentViewerProps) {
  const link = href === undefined ? src : href
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={label}
      size="lg"
      bare
      footer={
        link ? (
          <Button variant="ghost" size="sm" href={link} target="_blank" rel="noopener noreferrer">
            Open original
          </Button>
        ) : undefined
      }
    >
      <div data-cg-attachment-viewer="">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- a message attachment of arbitrary origin; no optimiser
          <img src={src} alt={label} />
        ) : (
          <span data-cg-attachment-viewer-empty="">Loading…</span>
        )}
      </div>
    </Modal>
  )
}
