/**
 * FILE KINDS — the ONE map from "what this file is" to its kind, its word and (in `ui/FileGlyph`) its glyph.
 *
 * Feather, 2026-11-22: "Anytime a document shows up anywhere, it needs to have the same look… the same document look with
 * the same glyphs for whatever it is." Before this, HQ held five kind maps that disagreed (a PDF fell to a generic file,
 * audio was a waveform in one list and a file-audio glyph in the next, lyrics wore three glyphs). Every door now asks here.
 *
 * Pure: no React. The input is whatever the caller knows — a Drive mime type, a file name, a coarse kind from a read
 * (`folder` · `doc` · `image` · `audio` · `video` · `pdf` · `file`), or a hint (`lyrics`, `link`).
 */

export type FileKind =
  | 'folder'
  | 'doc'
  | 'sheet'
  | 'slides'
  | 'pdf'
  | 'image'
  | 'audio'
  | 'video'
  | 'lyrics'
  | 'link'
  | 'file'

export const FILE_KINDS: readonly FileKind[] = ['folder', 'doc', 'sheet', 'slides', 'pdf', 'image', 'audio', 'video', 'lyrics', 'link', 'file']

const GOOGLE = 'application/vnd.google-apps.'

export const isGoogleMime = (mime: string | null | undefined): boolean => !!mime && mime.startsWith(GOOGLE)

export interface FileKindInput {
  mime?: string | null
  name?: string | null
  /** a read's coarse kind, or a hint the caller knows (`lyrics`, `link`) */
  kind?: string | null
}

const EXT: Record<string, FileKind> = {
  pdf: 'pdf',
  md: 'doc', markdown: 'doc', txt: 'doc', rtf: 'doc', doc: 'doc', docx: 'doc', pages: 'doc', odt: 'doc',
  csv: 'sheet', tsv: 'sheet', xls: 'sheet', xlsx: 'sheet', numbers: 'sheet', ods: 'sheet',
  ppt: 'slides', pptx: 'slides', key: 'slides', odp: 'slides',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', heic: 'image', avif: 'image', svg: 'image', tif: 'image', tiff: 'image', psd: 'image',
  wav: 'audio', mp3: 'audio', aif: 'audio', aiff: 'audio', flac: 'audio', m4a: 'audio', ogg: 'audio', aac: 'audio',
  mp4: 'video', mov: 'video', m4v: 'video', webm: 'video', avi: 'video', mkv: 'video',
}

/** the kind, from the most specific thing the caller knows: a hint, then the mime, then the extension, then the read's kind */
export function fileKindOf(f: FileKindInput): FileKind {
  const hint = (f.kind ?? '').toLowerCase()
  if (hint === 'lyrics' || hint === 'link' || hint === 'folder') return hint as FileKind
  const m = (f.mime ?? '').toLowerCase()
  if (m === `${GOOGLE}folder`) return 'folder'
  if (m === `${GOOGLE}document`) return 'doc'
  if (m === `${GOOGLE}spreadsheet`) return 'sheet'
  if (m === `${GOOGLE}presentation`) return 'slides'
  if (m === 'application/pdf') return 'pdf'
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('audio/')) return 'audio'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('text/')) return 'doc'
  const ext = (f.name ?? '').match(/\.([A-Za-z0-9]{1,8})$/)?.[1]?.toLowerCase()
  if (ext && EXT[ext]) return EXT[ext]
  if (hint === 'doc' || hint === 'sheet' || hint === 'slides' || hint === 'pdf' || hint === 'image' || hint === 'audio' || hint === 'video') return hint as FileKind
  return 'file'
}

/** the kind's plain word, for a sub-line: a Google kind says so (`Google Doc`), a `.md` says `.md`, an unknown file its extension */
export function fileKindWord(kind: FileKind, f: FileKindInput = {}): string {
  const google = isGoogleMime(f.mime)
  const ext = (f.name ?? '').match(/\.([A-Za-z0-9]{1,8})$/)?.[1]?.toLowerCase()
  switch (kind) {
    case 'doc': return google ? 'Google Doc' : ext === 'md' || ext === 'markdown' ? '.md' : ext ? `.${ext}` : 'document'
    case 'sheet': return google ? 'Google Sheet' : ext ? `.${ext}` : 'sheet'
    case 'slides': return google ? 'Google Slides' : ext ? `.${ext}` : 'slides'
    case 'pdf': return 'PDF'
    case 'file': return ext ? `.${ext}` : 'file'
    default: return kind
  }
}
