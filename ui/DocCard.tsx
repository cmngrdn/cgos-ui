import type { HTMLAttributes, MouseEvent, ReactNode } from 'react'
import { FileGlyph } from './FileGlyph'
import { fileKindOf, type FileKind, type FileKindInput } from '../lib/file-kind'
import './FileGlyph.css'
import './DocCard.css'

/**
 * DocCard — A DOCUMENT, drawn the one way it is drawn everywhere (Feather, 2026-11-22: "Anytime a document shows up
 * anywhere, it needs to have the same look… inside the normal library page or any other app, and then inside the studio").
 *
 * The sheet is PAPER (cmngrdn's Library P.5 §3, approved 2026-11-21 "a lighter direction"): a warm-grey card with dark ink,
 * its top-right corner folded, a soft shadow that follows the fold; the kind's glyph (`FileGlyph`, one per kind) on its
 * tile top-left; the title on up to three lines; a quiet sub-line at the foot. Hover lifts it and rings it inside its edge.
 *
 * - `onOpen` → the sheet is a `<button>`; `href` → an `<a>` (new tab); neither → static.
 * - `actions`: controls top-right, clear of the fold (a Drive button, Copy, ⋯) — they rise on hover; `leaves` keeps the
 *   first one (the Drive mark) showing at rest, for a kind that opens in Drive.
 * - `children` stand in for the title + sub (an editor's rename field); `stack` draws two sheets under it (a folder of sheets).
 * - `size`: `md` (default, 104px tall — the studio's row, a shelf's grid) · `sm` (72px — a dense shelf).
 * - The root takes any other attributes (a context menu, a long press, `data-*`), so a caller can make it a menu's trigger.
 *
 * Paper tokens: `--cg-paper` · `--cg-paper-deep` · `--cg-paper-ink` · `--cg-paper-ink-2` · `--cg-paper-line`; the hover ring
 * `--cg-doc-card-ring` (an app's colour). Width: the parent's (a grid cell), or `--cg-doc-card-w` in a scrolling row.
 */

export interface DocCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  title: ReactNode
  sub?: ReactNode
  kind?: FileKind
  file?: FileKindInput
  onOpen?: (e: MouseEvent<HTMLElement>) => void
  href?: string
  /** the open control's tooltip ("Open here", "Open in Drive") */
  openTitle?: string
  actions?: ReactNode
  leaves?: boolean
  stack?: boolean
  /** the record this document is open in (a ring) */
  current?: boolean
  size?: 'md' | 'sm'
  disabled?: boolean
  children?: ReactNode
}

export function DocCard({ title, sub, kind, file, onOpen, href, openTitle, actions, leaves, stack, current, size = 'md', disabled, children, className, ...rest }: DocCardProps) {
  const k = kind ?? fileKindOf(file ?? {})
  const face = (
    <>
      <FileGlyph kind={k} tile />
      {children ?? (
        <span data-cg-doc-card-text="">
          <span data-cg-doc-card-title="">{title}</span>
          {sub && <small data-cg-doc-card-sub="">{sub}</small>}
        </span>
      )}
    </>
  )
  const label = typeof title === 'string' ? title : undefined
  const open = href && !disabled ? (
    <a data-cg-doc-card-open="" href={href} target="_blank" rel="noopener noreferrer" title={openTitle ?? label} onClick={onOpen}>{face}</a>
  ) : onOpen ? (
    <button type="button" data-cg-doc-card-open="" title={openTitle ?? label} onClick={onOpen} disabled={disabled}>{face}</button>
  ) : (
    <span data-cg-doc-card-open="">{face}</span>
  )
  return (
    <div
      data-cg-doc-card=""
      data-kind={k}
      data-size={size}
      data-stack={stack || undefined}
      data-leaves={leaves || undefined}
      data-current={current || undefined}
      className={className}
      {...rest}
    >
      <div data-cg-doc-card-sheet="">
        {open}
        {actions && <span data-cg-doc-card-acts="">{actions}</span>}
      </div>
    </div>
  )
}
