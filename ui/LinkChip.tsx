import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { ArrowSquareOut, ShoppingBagOpen } from '@phosphor-icons/react/dist/ssr'
import { BRAND_META, SocialBrandIcon, brandInk, hasBrandMark } from './SocialBrandIcon'
import './LinkChip.css'

/**
 * LinkChip — a place to hear or buy something: the platform's real mark and name, on a pill tinted in the brand's colour.
 *
 * ONE CHIP FOR EVERY DOOR. The spotlight's link row drew it first (cmngrdn `SpotlightLinks`, mirrored byte for byte into
 * feather.fm); the Library's Distribute stage draws the same row to edit it (Feather, 2026-11-21: "the link chip should come
 * from cgos-ui since the site pulls those in"). So the chip lives here and the doors only map their links onto it — no copy.
 *
 * The tint is `brandInk(platform)`, the exact colour `SocialBrandIcon tone="brand"` paints, so the mark and its chip can
 * never disagree; the near-black brands (TikTok, X, Tidal…) answer `currentColor` and keep the accent tint. A link that is
 * not a platform wears the accent with a Phosphor glyph: `purchase` / `buy` a bag, anything else ↗.
 *
 * On a phone (≤ 767) the chip is the mark alone, a 46px square, the name on `aria-label` — `square={false}` keeps the
 * words (an editor that must read every name). `ghost` is an unlinked platform: dashed, muted, the caller's words
 * ("+ Spotify"). `beside` draws a control right after the chip (a Copy), the two held together; `children` stand in for
 * the words (an editor's field inside the chip).
 *
 * Element: `href` → an `<a>` opening a new tab; else `onClick` → a `<button>`; else a `<span>`. Pure: the caller owns
 * analytics (pass it in `onClick`). Theme with `--cg-link-chip-accent` · `--cg-link-chip-text` · `--cg-link-chip-font`
 * on any ancestor (a world's accent, its action font).
 */

export interface LinkChipProps {
  /** a `SocialBrandKey` (`spotify`, `apple_music`…), or `purchase` / `buy` / any other word */
  platform: string
  /** the chip's words; default the brand's label, "Buy" for a purchase link, else the platform's words */
  label?: string
  href?: string
  onClick?: (e: MouseEvent<HTMLElement>) => void
  /** a mark of the caller's in place of the brand's (the studio's globe for the page itself) */
  mark?: ReactNode
  /** an unlinked platform: dashed and muted */
  ghost?: boolean
  /** a ghost that holds something unfinished (a pasted link not saved): solid, in the sol tone */
  pending?: boolean
  /** ≤ 767 the mark alone as a 46px square (default true) */
  square?: boolean
  /** a control right after the chip, held together with it */
  beside?: ReactNode
  /** in place of the words (an editor's field inside the chip); the label still names it */
  children?: ReactNode
  title?: string
  'aria-label'?: string
  className?: string
}

const BUY = new Set(['purchase', 'buy'])

export function linkChipLabel(platform: string, label?: string): string {
  if (label) return label
  if (hasBrandMark(platform)) return BRAND_META[platform].label
  if (BUY.has(platform)) return 'Buy'
  return platform.replace(/_/g, ' ')
}

export function LinkChip({ platform, label, href, onClick, mark, ghost, pending, square = true, beside, children, title, className, ...rest }: LinkChipProps) {
  const name = linkChipLabel(platform, label)
  const brand = hasBrandMark(platform) ? platform : null
  const ink = brand ? brandInk(brand) : null
  const style = ink && ink !== 'currentColor' ? ({ '--cg-link-chip-ink': ink } as CSSProperties) : undefined
  const glyph = mark !== undefined ? mark
    : brand ? <SocialBrandIcon platform={brand} size={17} tone="brand" />
    : BUY.has(platform) ? <ShoppingBagOpen size={17} weight="fill" data-cg-link-chip-ic="" />
    : <ArrowSquareOut size={17} data-cg-link-chip-ic="" />
  const body = <>{glyph}{children ?? <span data-cg-link-chip-label="">{name}</span>}</>
  const common = {
    'data-cg-link-chip': '',
    'data-ghost': ghost || undefined,
    'data-pending': pending || undefined,
    'data-square': square ? '' : undefined,
    'aria-label': rest['aria-label'] ?? name,
    title: title ?? name,
    className,
    style,
  }
  const chip = href ? (
    <a {...common} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>{body}</a>
  ) : onClick ? (
    <button type="button" {...common} onClick={onClick}>{body}</button>
  ) : (
    <span {...common}>{body}</span>
  )
  return beside ? <span data-cg-link-chip-set="">{chip}{beside}</span> : chip
}

/** the wrapping row of chips (a `<nav>` with its label) */
export function LinkChipRow({ label = 'Listen elsewhere', children, className }: { label?: string; children: ReactNode; className?: string }) {
  return <nav data-cg-link-chip-row="" aria-label={label} className={className}>{children}</nav>
}
