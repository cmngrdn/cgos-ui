import type { ComponentType } from 'react'
import {
  File,
  FilePdf,
  FileText,
  FilmStrip,
  Folder,
  Image as ImageIcon,
  LinkSimple,
  MusicNotesSimple,
  Presentation,
  Table,
  Waveform,
} from '@phosphor-icons/react/dist/ssr'
import type { IconProps } from '@phosphor-icons/react'
import { fileKindOf, type FileKind, type FileKindInput } from '../lib/file-kind'
import './FileGlyph.css'

/**
 * FileGlyph — THE glyph for a file's kind, the same everywhere a document shows (Feather, 2026-11-22). One Phosphor icon
 * per kind (`lib/file-kind`); only the size and the weight change with where it sits, never the icon.
 *
 * `tile` draws it on its small rounded square (26px at the default size): the one document tile for rows, cards and
 * shelves. Theme the tile with `--cg-file-glyph-bg` · `--cg-file-glyph-ink` on an ancestor (paper re-inks it).
 */

const ICON: Record<FileKind, ComponentType<IconProps>> = {
  folder: Folder,
  doc: FileText,
  sheet: Table,
  slides: Presentation,
  pdf: FilePdf,
  image: ImageIcon,
  audio: Waveform,
  video: FilmStrip,
  lyrics: MusicNotesSimple,
  link: LinkSimple,
  file: File,
}

export interface FileGlyphProps {
  /** the kind, or what the caller knows about the file (mime · name · kind) */
  kind?: FileKind
  file?: FileKindInput
  /** the icon's px (default 14) */
  size?: number
  weight?: IconProps['weight']
  /** on its tile (the document tile) */
  tile?: boolean
  className?: string
}

export function FileGlyph({ kind, file, size = 14, weight = 'regular', tile, className }: FileGlyphProps) {
  const k = kind ?? fileKindOf(file ?? {})
  const Icon = ICON[k]
  const icon = <Icon size={size} weight={weight} aria-hidden />
  if (!tile) return icon
  return (
    <span data-cg-file-glyph="" data-kind={k} className={className} aria-hidden style={{ ['--_s' as string]: `${Math.round(size * 1.86)}px` }}>
      {icon}
    </span>
  )
}

export { fileKindOf }
