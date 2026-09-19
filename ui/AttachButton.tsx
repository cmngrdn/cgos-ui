'use client'

import { useRef } from 'react'
import { Paperclip } from '@phosphor-icons/react'

import { IconButton } from './IconButton'

/**
 * AttachButton — the paperclip, and the hidden `<input type="file">` behind it.
 *
 * THERE WERE TWO, AND THAT IS WHY THIS EXISTS. The SMS thread and the
 * transmission builder shared one implementation (cmngrdn `SmsAttachments`);
 * the inquiry reply drew its own inline — first as a `+`, then as a paperclip
 * that happened to match. Same control, same job, two files, and the second one
 * was missing the `onMouseDown + preventDefault` that keeps a contentEditable's
 * selection alive across the press. Feather, 2026-09-19: *"we need to
 * standardize one that is used between both compose types."*
 *
 * WHAT IS A PROP AND WHAT IS NOT. `accept` and `full` are: an MMS carries at
 * most ten files of particular types and an email attachment does not, so the
 * LIMITS belong to the surface that knows the transport. The GLYPH, the hidden
 * input, the press handling and the disabled-when-full behaviour are not —
 * those are the parts that drifted.
 *
 * `full` deliberately disables rather than hides. A control that vanishes when
 * you reach a limit never tells you there was one; the label does.
 */
export interface AttachButtonProps {
  /** The chosen files. The caller does everything else — upload, cap, error. */
  onPick: (files: File[]) => void
  /** `accept` on the input. Omit to take anything the surface will carry. */
  accept?: string
  multiple?: boolean
  disabled?: boolean
  /** Nothing more fits. Disables, and `fullLabel` says why. */
  full?: boolean
  label?: string
  fullLabel?: string
  /** `sm` in a composer toolbar (the default); `md` standing alone. */
  size?: 'sm' | 'md'
}

export function AttachButton({
  onPick,
  accept,
  multiple = true,
  disabled,
  full,
  label = 'Attach a file',
  fullLabel = 'Nothing more fits',
  size = 'sm',
}: AttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <span className="cg-attach">
      <IconButton
        size={size}
        variant="ghost"
        label={full ? fullLabel : label}
        icon={<Paperclip size={size === 'sm' ? 14 : 16} weight="regular" />}
        disabled={disabled || full}
        // The press must not move focus: on a contentEditable surface the
        // selection collapses the moment it does, and the caller's insert lands
        // at position zero. The file dialog blurs the editor afterwards anyway,
        // which is why only the PRESS is defended.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
      />
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="cg-attach-input"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          // Cleared before the callback runs, so picking the same file twice in
          // a row still fires `change` the second time.
          e.target.value = ''
          onPick(files)
        }}
      />
    </span>
  )
}
