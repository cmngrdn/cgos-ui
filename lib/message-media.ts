/**
 * What a text message can carry besides words — picture texts (MMS) and the
 * files they attach. Pure; no fetch, no React.
 *
 * MIRRORS cgos `src/sms_media.py` (docs/two-way-messaging-plan.md §4, §12):
 *   - `MMS_LIMITS`      ↔ `MAX_MEDIA` (10) and `MAX_OUTBOUND_BYTES` (5 MB)
 *   - `MMS_ATTACH_TYPES` ⊂ `OUTBOUND_TYPES` — the subset a composer OFFERS
 *     (images, contact cards, PDFs). cgos accepts video and audio too; nothing
 *     here offers them, because a phone's MMS gateway usually re-encodes them
 *     past recognition and nobody has asked.
 *   - `attachmentKind` reads the same types `public_entries` hands a client.
 *
 * cgos re-checks every attachment with a HEAD before anything is sent, so a
 * disagreement here costs a refused send, never a bad one. When the two
 * disagree, cgos wins and this file is the bug.
 */

/** How many files, and how many bytes in total, one text may carry. */
export const MMS_LIMITS = {
  files: 10,
  totalBytes: 5 * 1024 * 1024,
} as const

/** What a composer offers to attach. vCards are uploaded as `text/x-vcard`. */
export const MMS_ATTACH_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/vcard',
  'text/x-vcard',
  'application/pdf',
]

/** The `accept` attribute for a file input that offers exactly those. A .vcf
 *  often arrives with an empty type, so the extensions are listed too. */
export const MMS_ATTACH_ACCEPT =
  'image/jpeg,image/png,image/gif,.jpg,.jpeg,.png,.gif,.vcf,text/vcard,text/x-vcard,.pdf,application/pdf'

/** The type a vCard is stored as. Twilio compares the served Content-Type with
 *  the file, and `text/x-vcard` is the one every handset recognises. */
export const VCARD_CONTENT_TYPE = 'text/x-vcard'

export type AttachmentKind = 'image' | 'contact' | 'file'

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/heic',
  'image/heif',
])

const CONTACT_TYPES = new Set(['text/vcard', 'text/x-vcard', 'text/directory'])

const BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  vcf: VCARD_CONTENT_TYPE,
  vcard: VCARD_CONTENT_TYPE,
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ics: 'text/calendar',
  txt: 'text/plain',
}

/** `"Image/JPEG; charset=x"` → `"image/jpeg"`. Empty for nothing. */
export function mediaType(value: string | null | undefined): string {
  return String(value ?? '').split(';')[0].trim().toLowerCase()
}

function extensionOf(name: string | null | undefined): string {
  const path = String(name ?? '').split(/[?#]/)[0]
  const last = path.split('/').pop() ?? ''
  return last.includes('.') ? (last.split('.').pop() ?? '').toLowerCase() : ''
}

/** The type a file name or URL implies, for rows stored without one (cgos
 *  `guess_content_type`). Null when the extension says nothing. */
export function guessContentType(nameOrUrl: string | null | undefined): string | null {
  return BY_EXTENSION[extensionOf(nameOrUrl)] ?? null
}

/**
 * How an attachment is drawn: a picture inline, a contact card as a chip,
 * anything else as a file chip. A missing type falls back to the extension.
 */
export function attachmentKind(
  contentType: string | null | undefined,
  nameOrUrl?: string | null,
): AttachmentKind {
  const type = mediaType(contentType) || mediaType(guessContentType(nameOrUrl))
  if (IMAGE_TYPES.has(type)) return 'image'
  if (CONTACT_TYPES.has(type)) return 'contact'
  return 'file'
}

/** A short name for what the attachment is — "Photo", "Contact card", "PDF". */
export function attachmentLabel(
  contentType: string | null | undefined,
  nameOrUrl?: string | null,
): string {
  const type = mediaType(contentType) || mediaType(guessContentType(nameOrUrl))
  if (IMAGE_TYPES.has(type)) return type === 'image/gif' ? 'GIF' : 'Photo'
  if (CONTACT_TYPES.has(type)) return 'Contact card'
  if (type === 'application/pdf') return 'PDF'
  if (type === 'text/calendar') return 'Calendar invite'
  if (type === 'text/plain') return 'Text file'
  if (type.startsWith('video/')) return 'Video'
  if (type.startsWith('audio/')) return 'Audio'
  return 'File'
}

/** "2.4 MB", "830 KB", "12 bytes". */
export function formatBytes(bytes: number | null | undefined): string {
  const n = typeof bytes === 'number' && Number.isFinite(bytes) ? Math.max(0, bytes) : 0
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(n >= 10 * 1024 * 1024 ? 0 : 1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} byte${n === 1 ? '' : 's'}`
}

/**
 * The Content-Type a picked file should be uploaded with, or null when a text
 * can't carry it. A `.vcf` is always `text/x-vcard` — browsers report it as
 * `text/vcard`, `text/x-vcard` or nothing at all depending on the platform.
 */
export function uploadContentType(file: { name: string; type: string }): string | null {
  const ext = extensionOf(file.name)
  if (ext === 'vcf' || ext === 'vcard' || CONTACT_TYPES.has(mediaType(file.type))) {
    return VCARD_CONTENT_TYPE
  }
  const type = mediaType(file.type) || mediaType(guessContentType(file.name))
  if (type === 'image/jpg') return 'image/jpeg'
  return MMS_ATTACH_TYPES.includes(type) ? type : null
}

export interface AttachmentCandidate {
  name: string
  type: string
  size: number
}

/**
 * Whether these files can join what is already attached. One sentence for a
 * person when they can't, else null. `existingBytes` is what the attached
 * files add up to (unknown sizes count as 0; cgos checks again at send).
 */
export function attachmentProblem(
  existingCount: number,
  existingBytes: number,
  adding: readonly AttachmentCandidate[],
): string | null {
  if (adding.length === 0) return null
  const count = existingCount + adding.length
  if (count > MMS_LIMITS.files) {
    return `A text can carry at most ${MMS_LIMITS.files} attachments.`
  }
  for (const f of adding) {
    if (!uploadContentType(f)) {
      return `${f.name || 'That file'} can't go in a text. Attach a JPEG, PNG or GIF picture, a contact card (.vcf) or a PDF.`
    }
  }
  const total = existingBytes + adding.reduce((sum, f) => sum + (f.size || 0), 0)
  if (total > MMS_LIMITS.totalBytes) {
    return `Attachments can add up to ${formatBytes(MMS_LIMITS.totalBytes)}; these come to ${formatBytes(total)}.`
  }
  return null
}

/**
 * One line naming what a message carried — "Photo", "Contact card +2" — for a
 * row with no room to draw them. Null when it carried nothing.
 */
export function attachmentsSummary(
  entries: readonly { content_type?: string | null; url?: string | null }[] | null | undefined,
): string | null {
  if (!entries || entries.length === 0) return null
  const first = attachmentLabel(entries[0].content_type, entries[0].url)
  return entries.length > 1 ? `${first} +${entries.length - 1}` : first
}

/** What a conversation list shows for a message with no words. */
export const MEDIA_ONLY_PREVIEW = 'Photo'

/** A message's one-line preview: its words, or "Photo" when it has none. */
export function messagePreview(body: string | null | undefined): string {
  const text = String(body ?? '').trim()
  return text || MEDIA_ONLY_PREVIEW
}
