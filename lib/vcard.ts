/**
 * Read a contact card (.vcf) far enough to show what a phone will show: the
 * name, the numbers, the organisation and the photo. Pure; no fetch.
 *
 * Covers vCard 2.1, 3.0 and 4.0 as phones write them:
 *   - folded lines (a CRLF followed by a space or tab continues the line);
 *   - `group.PROP;PARAM=x:value` — groups and parameters are read, not kept;
 *   - escaped `\,` `\;` `\n` `\\` in text values;
 *   - QUOTED-PRINTABLE values (2.1), including soft line breaks;
 *   - PHOTO as inline base64 (`ENCODING=b` / `BASE64`), a `data:` URI, or an
 *     https link.
 *
 * THE PHOTO IS THE ONE VALUE THAT REACHES THE DOM AS A URL, so it is only
 * ever a `data:image/(jpeg|png|gif|webp)` URI built here, or — only when the
 * caller says the card is its own — an `https:` link. A card that says
 * `PHOTO;VALUE=uri:javascript:…` has no photo.
 *
 * ⚠️ A REMOTE PHOTO IS OFF BY DEFAULT. Drawing `PHOTO;VALUE=uri:https://…`
 * as an `<img>` fetches the sender's URL from the operator's browser, which
 * hands whoever sent the card the operator's IP address, browser and the
 * moment they opened the thread — a tracking pixel in a contact card. So a
 * card somebody SENT us shows only an inline photo. `{ remotePhoto: true }`
 * is for a card the workspace wrote itself (its own contact card, one it
 * attached to an outbound text), where the link is the workspace's own.
 */

export interface ParseVCardOptions {
  /**
   * Allow an `https:` PHOTO/LOGO link. Only for a card the workspace itself
   * made — never for one that arrived in a text. Default false.
   */
  remotePhoto?: boolean
}

export interface VCardSummary {
  /** FN, else N assembled as "Given Family", else ORG. */
  name: string | null
  org: string | null
  /** In file order, as written ("+1 612 555 0100"). */
  phones: string[]
  emails: string[]
  /** An inline image URI (or, for the workspace's own card, https), or null. */
  photo: string | null
}

interface Line {
  name: string
  params: Record<string, string>
  value: string
}

const PHOTO_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

function unfold(text: string): string[] {
  const out: string[] = []
  for (const physical of text.replace(/\r\n?/g, '\n').split('\n')) {
    const last = out.length - 1
    const prev = last >= 0 ? out[last] : null
    if (prev !== null && /^[ \t]/.test(physical)) {
      // RFC folding: the leading space or tab is not part of the value.
      out[last] = prev + physical.slice(1)
    } else if (
      prev !== null &&
      prev.endsWith('=') &&
      /QUOTED-PRINTABLE/i.test(prev.slice(0, prev.indexOf(':')))
    ) {
      // A quoted-printable soft break: the `=` goes, the next line joins.
      out[last] = prev.slice(0, -1) + physical
    } else {
      out.push(physical)
    }
  }
  return out
}

function parseLine(raw: string): Line | null {
  const colon = raw.indexOf(':')
  if (colon <= 0) return null
  const head = raw.slice(0, colon)
  const value = raw.slice(colon + 1)
  const parts = head.split(';')
  const name = (parts[0] ?? '').split('.').pop()?.trim().toUpperCase() ?? ''
  if (!name) return null
  const params: Record<string, string> = {}
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=')
    if (eq < 0) {
      // vCard 2.1 bare parameters: `TEL;CELL;VOICE:` or `PHOTO;JPEG;BASE64:`.
      const bare = p.trim().toUpperCase()
      if (bare === 'BASE64' || bare === 'B' || bare === 'QUOTED-PRINTABLE') params.ENCODING = bare
      else if (bare) params.TYPE = params.TYPE ? `${params.TYPE},${bare}` : bare
      continue
    }
    const key = p.slice(0, eq).trim().toUpperCase()
    const val = p.slice(eq + 1).trim().replace(/^"|"$/g, '')
    params[key] = params[key] ? `${params[key]},${val}` : val
  }
  return { name, params, value }
}

function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = []
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (c === '=' && /^[0-9A-Fa-f]{2}$/.test(value.slice(i + 1, i + 3))) {
      bytes.push(parseInt(value.slice(i + 1, i + 3), 16))
      i += 2
    } else {
      bytes.push(value.charCodeAt(i) & 0xff)
    }
  }
  // Phones write UTF-8; a card in another charset reads with replacement
  // characters rather than failing.
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes))
}

function unescapeText(value: string): string {
  return value.replace(/\\([\\,;nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c))
}

/** Split on unescaped `;` (structured values like N and ORG). */
function splitStructured(value: string): string[] {
  const out: string[] = []
  let cur = ''
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (c === '\\' && i + 1 < value.length) {
      cur += c + value[i + 1]
      i++
    } else if (c === ';') {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out.map((s) => unescapeText(s).trim())
}

function textValue(line: Line): string {
  const enc = (line.params.ENCODING ?? '').toUpperCase()
  return enc === 'QUOTED-PRINTABLE' ? decodeQuotedPrintable(line.value) : line.value
}

function photoType(params: Record<string, string>): string | null {
  const t = (params.TYPE ?? params.MEDIATYPE ?? '').toLowerCase()
  for (const part of t.split(',')) {
    const key = part.trim().replace(/^image\//, '')
    if (PHOTO_TYPES[key]) return PHOTO_TYPES[key]
  }
  return null
}

function sniffImage(base64: string): string | null {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return null
}

function safePhoto(line: Line, remotePhoto: boolean): string | null {
  const value = line.value.trim()
  const enc = (line.params.ENCODING ?? '').toUpperCase()
  if (enc === 'B' || enc === 'BASE64') {
    const data = value.replace(/\s+/g, '')
    if (!/^[A-Za-z0-9+/]+=*$/.test(data)) return null
    const type = photoType(line.params) ?? sniffImage(data)
    return type ? `data:${type};base64,${data}` : null
  }
  const dataUri = /^data:image\/(jpeg|jpg|png|gif|webp);base64,([A-Za-z0-9+/\s]+=*)$/i.exec(value)
  if (dataUri) {
    const type = PHOTO_TYPES[dataUri[1].toLowerCase()]
    return `data:${type};base64,${dataUri[2].replace(/\s+/g, '')}`
  }
  if (remotePhoto && /^https:\/\/[^\s"'<>]+$/i.test(value)) return value
  return null
}

/**
 * The first card in `text`, summarised; null when there is no card in it.
 * A second card in the same file is ignored — a contact card for a text is
 * one person or one business.
 *
 * Pass `{ remotePhoto: true }` only for the workspace's own card; see the
 * note at the top of this file.
 */
export function parseVCard(
  text: string | null | undefined,
  options: ParseVCardOptions = {},
): VCardSummary | null {
  const remotePhoto = options.remotePhoto === true
  if (!text || !/BEGIN:VCARD/i.test(text)) return null
  let inCard = false
  let fn: string | null = null
  let n: string | null = null
  let org: string | null = null
  let photo: string | null = null
  let photoIsPortrait = false
  const phones: string[] = []
  const emails: string[] = []
  for (const raw of unfold(text)) {
    const line = parseLine(raw)
    if (!line) continue
    if (line.name === 'BEGIN' && /^VCARD$/i.test(line.value.trim())) {
      if (inCard) break
      inCard = true
      continue
    }
    if (!inCard) continue
    if (line.name === 'END') break
    switch (line.name) {
      case 'FN': {
        const v = unescapeText(textValue(line)).trim()
        if (v && !fn) fn = v
        break
      }
      case 'N': {
        const [family = '', given = '', additional = '', prefix = '', suffix = ''] =
          splitStructured(textValue(line))
        const v = [prefix, given, additional, family, suffix].filter(Boolean).join(' ').trim()
        if (v && !n) n = v
        break
      }
      case 'ORG': {
        const v = splitStructured(textValue(line)).filter(Boolean).join(', ')
        if (v && !org) org = v
        break
      }
      case 'TEL': {
        const v = unescapeText(textValue(line)).replace(/^tel:/i, '').trim()
        if (v && !phones.includes(v)) phones.push(v)
        break
      }
      case 'EMAIL': {
        const v = unescapeText(textValue(line)).replace(/^mailto:/i, '').trim()
        if (v && !emails.includes(v)) emails.push(v)
        break
      }
      case 'PHOTO':
      case 'LOGO': {
        // The first PHOTO wins; a LOGO fills in only until one arrives.
        if (photoIsPortrait || (photo && line.name === 'LOGO')) break
        const p = safePhoto(line, remotePhoto)
        if (p) {
          photo = p
          photoIsPortrait = line.name === 'PHOTO'
        }
        break
      }
      default:
        break
    }
  }
  if (!inCard) return null
  return { name: fn ?? n ?? org, org, phones, emails, photo }
}
