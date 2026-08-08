'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'

import {
  CHANNEL_CAPABILITIES,
  composerIsEmpty,
  effectivePasteMode,
  safeHref,
  sanitizePastedHtml,
  type ComposerCapability,
  type ComposerChannel,
} from './composer-core'

export {
  CHANNEL_CAPABILITIES,
  composerIsEmpty,
  sanitizePastedHtml,
  type ComposerCapability,
  type ComposerChannel,
}

/**
 * Composer — one text-entry engine for every surface that sends a message.
 *
 * The platform had grown five of these and they agreed on almost nothing. The
 * inquiry email reply was a real rich-text editor — contentEditable,
 * execCommand, bold/italic/underline/lists/link, with genuinely hard-won
 * details in it. The transmission email builder, the SMS thread, the SMS
 * transmission body and the social publish box were all bare `<textarea>`.
 *
 * The split was almost exactly wrong: the ONE composer that could format text
 * couldn't insert an emoji, and the three that could insert emoji couldn't
 * format anything. Nobody had both, and an operator moving between them had to
 * relearn the surface each time.
 *
 * CAPABILITY BELONGS TO THE CHANNEL, NOT THE EDITOR. This is the whole design.
 * A bold button is correct in an email and actively harmful in an SMS: SMS is
 * GSM-7/UCS-2 encoded PLAIN TEXT with no markup layer, so "bold" can only be
 * emitted as Unicode math-alphanumerics (𝗯𝗼𝗹𝗱) — separate codepoints that force
 * the whole body to UCS-2 and halve the per-segment budget. Measured on a real
 * 40-character send: 1 segment plain, 2 segments in Unicode-bold, for the same
 * words. So the engine is shared and `capabilities` is per-surface. When RCS
 * carries formatting, its channel gains the flag and no component changes.
 *
 * PASTE IS ALSO A CAPABILITY, and the two live consumers want opposite things.
 * The inquiry composer deliberately strips formatting on paste — a decision
 * worth keeping, since a reply pasted out of a client's email should not drag
 * their fonts into your thread. The transmission builder wants the opposite
 * (task #152: "i should be able to paste a message in here with it retaining
 * the text formatting"). Hence `paste`, defaulting to `plain` so the stricter
 * behaviour is what you get by not thinking about it.
 *
 * DETAILS CARRIED OVER, each of which was a bug once (cmngrdn spike R1):
 *   - Toolbar buttons fire on `mousedown` with `preventDefault()`, never
 *     `click`. Without it, focus moves to the button and the selection
 *     collapses before the command runs — the button appears to do nothing.
 *   - `exec()` focuses the editor first, or the command targets whatever the
 *     document's selection happens to be.
 *   - Emptiness is `innerText.trim()`, not `innerHTML`. iOS Safari leaves a
 *     stray `<br>` in a cleared field, so an innerHTML check reports content
 *     that isn't there and enables Send on an empty message.
 *   - The editor is UNCONTROLLED, synced only when `value` diverges from the
 *     DOM. Writing innerHTML every render puts the caret back at position zero
 *     on every keystroke.
 *
 * WHAT THIS IS NOT. It does not send anything, own attachments, or know what a
 * transmission is — those stay with the surface. It renders a toolbar, an
 * editable region, and whatever the surface slots into `toolbarExtras` (which
 * is how the emoji picker arrives without this package taking on emoji data).
 */

export interface ComposerProps {
  /** Current body as HTML. Uncontrolled internally — see the header. */
  value: string
  onChange: (html: string) => void
  /** Formatting the channel can carry. Prefer passing `channel`. */
  capabilities?: ComposerCapability[]
  /** Sets `capabilities` from CHANNEL_CAPABILITIES. Explicit `capabilities`
   *  wins if both are given. */
  channel?: ComposerChannel
  /** `plain` strips formatting on paste (the safer default). `rich` keeps an
   *  allowlist of tags. */
  paste?: 'plain' | 'rich'
  placeholder?: string
  disabled?: boolean
  /** Fires on ⌘/Ctrl+Enter. Omit to disable the shortcut. */
  onSubmit?: () => void
  /** Rendered at the end of the toolbar — where the emoji picker goes. */
  toolbarExtras?: ReactNode
  /** Rendered under the editor: encoding HUD, attachments, character count. */
  footer?: ReactNode
  ariaLabel?: string
  /** Extra class on the root, for surface-specific sizing. */
  className?: string
}

interface ToolButton {
  cap: ComposerCapability
  cmd: string
  label: string
  glyph: ReactNode
}

const BUTTONS: ToolButton[] = [
  { cap: 'bold', cmd: 'bold', label: 'Bold', glyph: <strong>B</strong> },
  { cap: 'italic', cmd: 'italic', label: 'Italic', glyph: <em>I</em> },
  { cap: 'underline', cmd: 'underline', label: 'Underline', glyph: <u>U</u> },
  { cap: 'bulletList', cmd: 'insertUnorderedList', label: 'Bulleted list', glyph: '•' },
  { cap: 'orderedList', cmd: 'insertOrderedList', label: 'Numbered list', glyph: '1.' },
]

export function Composer({
  value,
  onChange,
  capabilities,
  channel,
  paste = 'plain',
  placeholder,
  disabled,
  onSubmit,
  toolbarExtras,
  footer,
  ariaLabel = 'Message body',
  className,
}: ComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const caps = capabilities ?? (channel ? CHANNEL_CAPABILITIES[channel] : [])
  const showToolbar = caps.length > 0 || Boolean(toolbarExtras)

  // A channel that cannot RENDER formatting must not RETAIN it on paste. Asked
  // for `rich` on an SMS surface, keeping the markup would mean the operator
  // sees bold in the composer, the send path strips it, and the recipient gets
  // something that doesn't match the preview — or worse, the markup survives as
  // literal characters and pushes the body into a second segment.
  //
  // Enforced here rather than left to each callsite because it is the same
  // rule everywhere and a surface passing the wrong prop should be unable to
  // produce the wrong result. `capabilities={[]}` is the machine-readable form
  // of "this transport is plain text".
  const effectivePaste = effectivePasteMode(caps, paste)

  // Sync only on divergence. Comparing against the live DOM is what keeps the
  // caret where the operator left it — see the header.
  useEffect(() => {
    const el = editorRef.current
    if (el && value !== el.innerHTML) el.innerHTML = value
  }, [value])

  const emit = useCallback(() => {
    const el = editorRef.current
    if (el) onChange(el.innerHTML)
  }, [onChange])

  const exec = useCallback(
    (cmd: string, arg?: string) => {
      editorRef.current?.focus()
      document.execCommand(cmd, false, arg)
      emit()
    },
    [emit],
  )

  const promptLink = useCallback(() => {
    const url = window.prompt('Link URL')
    const safe = safeHref(url)
    if (!safe) return
    const sel = window.getSelection()
    // A collapsed selection makes createLink a silent no-op in Safari, so
    // insert the URL as its own visible label instead of doing nothing.
    if (!sel || sel.isCollapsed) exec('insertHTML', `<a href="${safe}">${safe}</a>`)
    else exec('createLink', safe)
  }, [exec])

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (effectivePaste === 'rich') {
        const html = e.clipboardData.getData('text/html')
        if (html) {
          document.execCommand('insertHTML', false, sanitizePastedHtml(html))
          emit()
          return
        }
      }
      const text = e.clipboardData.getData('text/plain') || ''
      if (!text) return
      document.execCommand('insertText', false, text)
      emit()
    },
    [effectivePaste, emit],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onSubmit) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!composerIsEmpty(editorRef.current)) onSubmit()
      }
    },
    [onSubmit],
  )

  return (
    <div className={`cg-composer${className ? ` ${className}` : ''}`}>
      {showToolbar && (
        <div className="cg-composer-toolbar" role="toolbar" aria-label="Formatting">
          {BUTTONS.filter((b) => caps.includes(b.cap)).map((b) => (
            <button
              key={b.cap}
              type="button"
              className="cg-composer-tool"
              aria-label={b.label}
              title={b.label}
              disabled={disabled}
              // mousedown + preventDefault, never onClick — see the header.
              onMouseDown={(e) => {
                e.preventDefault()
                exec(b.cmd)
              }}
            >
              {b.glyph}
            </button>
          ))}
          {caps.includes('link') && (
            <button
              type="button"
              className="cg-composer-tool"
              aria-label="Insert link"
              title="Insert link"
              disabled={disabled}
              onMouseDown={(e) => {
                e.preventDefault()
                promptLink()
              }}
            >
              🔗
            </button>
          )}
          {toolbarExtras && <span className="cg-composer-extras">{toolbarExtras}</span>}
        </div>
      )}

      <div
        ref={editorRef}
        className="cg-composer-editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        data-placeholder={placeholder}
        onInput={emit}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
      />

      {footer && <div className="cg-composer-footer">{footer}</div>}
    </div>
  )
}
