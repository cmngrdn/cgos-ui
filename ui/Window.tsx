import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { CaretDown, Check, GearSix, MagnifyingGlass, Plus, SlidersHorizontal, X } from '@phosphor-icons/react'
import { IconButton } from './IconButton'
import { Popover } from './Popover'
import { appColor, type AppId } from '../lib/apps'

/**
 * THE WINDOW — an app in HQ is a window, and its top is the BAND
 * (cgos `docs/hq-system.md` §4–§5, W1–W5, M1–M5). Visual shell only: routing,
 * auth and role gating stay in the consumer and arrive as props.
 *
 *   ┌─ band (48px, in the app's colour, on the line) ─────────────────────┐
 *   │ [chip Name] Tab Tab ⚙  +  ≡  🔍 [query ━━━━━━━━━━→]      [Show chip] │
 *   ├──────────────────────────────────────────────────────────────────────┤
 *   │ panel (the open mode's, when it has one) │ body                      │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * - The NAME is the app's home (W2): at home it wears the "you are here" pill.
 * - TABS are workflows you return to (W3); they carry no counts (W5). Narrow,
 *   they fold into the name's menu BY MEASURE (W4) — the `soon` ones step
 *   aside first, then the rest fold.
 * - The band reads LEFT TO RIGHT, the way you arrive (Feather, 2026-10-21): the app, its tabs, then what you do there.
 *   SETUP is the last tab — a gear, because every app's settings look alike — since it changes what you are looking
 *   at, as a tab does. Then the modes, right after the tabs, always in this order with the same glyphs:
 *   Create · Adjust · Search. They let you keep seeing what you were looking at while you act. `modes` says which
 *   this viewer sees (Create editors+, Setup admins+ — the consumer decides). Esc or the glyph again returns; a mode
 *   never opens by itself.
 * - SEARCH is last so its field grows RIGHTWARD into the band's empty middle (M1): nothing to its left moves, the
 *   tabs stay readable. `/` opens it; Esc leaves and keeps the query.
 * - The NAME is home from anywhere: it leaves an open mode (Setup included) as well as a tab.
 * - While a Show narrows, its chip sits at the band's right end (`show`, W5).
 *
 * `renderLink` lets a router draw the name and tab links (Next's `Link`);
 * without it they are plain anchors.
 */

export type WindowMode = 'search' | 'adjust' | 'create' | 'setup'
/** every mode, in the band's order: Setup rides the tabs as a gear, then Create · Adjust · Search */
export const WINDOW_MODES: readonly WindowMode[] = ['setup', 'create', 'adjust', 'search']
/** the modes that sit after the tabs, in order */
const ACT_MODES: readonly WindowMode[] = ['create', 'adjust', 'search']

export interface WindowTab {
  key: string
  label: string
  /** a place (a route) … */
  href?: string
  /** … or a way of seeing this window */
  onSelect?: () => void
  current?: boolean
  /** not built yet: steps aside first when the band is narrow, never in the menu */
  soon?: boolean
}

export interface WindowLinkProps {
  href: string
  className?: string
  children: ReactNode
  title?: string
  'aria-current'?: 'page'
  'data-cg-window-tab'?: string
  'data-cg-window-name'?: string
  'data-soon'?: string
  onClick?: (ev: ReactMouseEvent<HTMLAnchorElement>) => void
}

export interface WindowBandProps {
  /** an HQ app — its colour is the `--cg-app-<id>` token */
  app?: AppId
  /** a colour for a band that is not an app's (a CSS var); ignored when `app` is set */
  color?: string
  name: string
  /** the app's chip (a `ModuleIconChip`) */
  icon?: ReactNode
  /** where the name goes (the app's overview); or `onHome` for an app whose home is a view */
  homeHref?: string
  onHome?: () => void
  /** at the app's home (no tab current): the name wears the "you are here" pill */
  atHome?: boolean
  tabs?: WindowTab[]
  /** which modes this viewer sees; omitted = none */
  modes?: Partial<Record<WindowMode, boolean>>
  mode?: WindowMode | null
  onMode?: (mode: WindowMode | null) => void
  /** SEARCH RUNS BESIDE THE OTHER MODES (Feather, 2026-10-21: a query and a shape at once): given, the search box is open
   *  by this, not by `mode`, so Adjust or Create can stay on while you search. Omitted, Search is one of the modes */
  searchOpen?: boolean
  onSearchOpen?: (open: boolean) => void
  /** the search field's query while Search is on (M1) */
  query?: string
  onQuery?: (q: string) => void
  searchPlaceholder?: string
  /** a Show's chip while it narrows (W5) */
  show?: ReactNode
  /** anything else that must ride the band's right end before the modes (rare; prefer a mode) */
  end?: ReactNode
  renderLink?: (props: WindowLinkProps) => ReactNode
  className?: string
}

const MODE_LABEL: Record<WindowMode, string> = {
  search: 'Search',
  adjust: 'Adjust',
  create: 'Create',
  setup: 'Setup',
}
const MODE_ICON: Record<WindowMode, ReactNode> = {
  search: <MagnifyingGlass weight="bold" />,
  adjust: <SlidersHorizontal weight="bold" />,
  create: <Plus weight="bold" />,
  setup: <GearSix weight="bold" />,
}

function isEditable(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
}

const defaultLink = (p: WindowLinkProps) => {
  const { children, ...rest } = p
  return <a {...rest}>{children}</a>
}

export function WindowBand({
  app,
  color,
  name,
  icon,
  homeHref,
  onHome,
  atHome,
  tabs,
  modes,
  mode = null,
  onMode,
  query = '',
  onQuery,
  searchOpen: searchOpenProp,
  onSearchOpen,
  searchPlaceholder,
  show,
  end,
  renderLink = defaultLink,
  className,
}: WindowBandProps) {
  const band = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLSpanElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const [fold, setFold] = useState<'soon' | 'menu' | null>(null)
  const [menu, setMenu] = useState(false)
  const shown = ACT_MODES.filter((m) => modes?.[m])
  const searchOpen = searchOpenProp ?? mode === 'search'
  const setSearch = (open: boolean) => (onSearchOpen ? onSearchOpen(open) : onMode?.(open ? 'search' : null))
  const cur = tabs?.find((t) => t.current)

  // W4: fold by measure — lay everything out, then step down (soon first, then the menu)
  useLayoutEffect(() => {
    const el = band.current
    if (!el || !tabs?.length) return
    const measure = () => {
      const strip = el.querySelector<HTMLElement>('[data-cg-window-tabs]')
      if (!strip) return
      el.dataset.measure = 'all'
      if (strip.scrollWidth <= strip.clientWidth + 1) {
        delete el.dataset.measure
        return setFold(null)
      }
      el.dataset.measure = 'soon'
      const fits = strip.scrollWidth <= strip.clientWidth + 1
      delete el.dataset.measure
      setFold(fits ? 'soon' : 'menu')
    }
    measure()
    // the band AND the strip: a stylesheet or a font arriving after the first measure changes the strip's width without
    // touching the band's, and a fold decided then would otherwise stick
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const strip = el.querySelector<HTMLElement>('[data-cg-window-tabs]')
    if (strip) ro.observe(strip)
    let live = true
    document.fonts?.ready.then(() => live && measure())
    return () => {
      live = false
      ro.disconnect()
    }
  }, [tabs?.length, mode])

  // §5: Esc leaves the mode (search keeps its query); `/` opens Search
  useEffect(() => {
    if (!onMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      // Esc steps back one at a time: an open search first (it keeps its query), then the mode
      if (e.key === 'Escape' && onSearchOpen && searchOpenProp) {
        e.preventDefault()
        onSearchOpen(false)
      } else if (e.key === 'Escape' && mode) {
        e.preventDefault()
        onMode(null)
      } else if (e.key === '/' && modes?.search && !searchOpen && !isEditable(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (onSearchOpen) onSearchOpen(true)
        else onMode('search')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode, modes?.search, onMode, onSearchOpen, searchOpenProp, searchOpen])

  useEffect(() => {
    if (searchOpen) field.current?.focus()
  }, [searchOpen])

  const tint = app ? appColor(app) : color
  const style = tint ? ({ '--cg-window-app': tint } as CSSProperties) : undefined
  const nameInner = (
    <>
      {icon && <span data-cg-window-chip="" aria-hidden>{icon}</span>}
      <span data-cg-window-label="">{name}</span>
    </>
  )
  const nameCurrent = atHome && !cur ? ('page' as const) : undefined
  const nameEl = homeHref
    ? renderLink({
        href: homeHref,
        'data-cg-window-name': '',
        'aria-current': nameCurrent,
        title: `${name} — its overview`,
        onClick: (ev) => {
          if (mode) onMode?.(null)
          if (searchOpenProp) onSearchOpen?.(false)
          if (onHome) {
            ev.preventDefault()
            onHome()
          }
        },
        children: nameInner,
      })
    : (
        <button type="button" data-cg-window-name="" aria-current={nameCurrent} title={`${name} — its overview`} onClick={() => { if (mode) onMode?.(null); if (searchOpenProp) onSearchOpen?.(false); onHome?.() }}>
          {nameInner}
        </button>
      )

  const inSetup = mode === 'setup'
  const leaveSetup = () => { if (inSetup) onMode?.(null) }
  const tabEl = (t: WindowTab) =>
    t.href
      ? <Fragment key={t.key}>{renderLink({ href: t.href, 'data-cg-window-tab': '', 'aria-current': t.current && !inSetup ? 'page' : undefined, 'data-soon': t.soon ? '' : undefined, onClick: inSetup ? leaveSetup : undefined, children: t.label })}</Fragment>
      : (
          <button key={t.key} type="button" data-cg-window-tab="" aria-pressed={!!t.current && !inSetup} data-soon={t.soon ? '' : undefined} onClick={() => { leaveSetup(); t.onSelect?.() }}>
            {t.label}
          </button>
        )

  return (
    <div ref={band} data-cg-window-band="" data-fold={fold ?? undefined} data-mode={mode ?? undefined} className={className} style={style}>
      <span data-cg-window-namewrap="" ref={nameRef}>
        {nameEl}
        {tabs?.length ? (
          <span data-cg-window-menu="">
            <button type="button" data-cg-window-menu-trigger="" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((o) => !o)} title={`${name} — go to`}>
              <span>{cur?.label ?? name}</span>
              <CaretDown size={12} weight="bold" aria-hidden />
            </button>
            <Popover open={menu} onClose={() => setMenu(false)} anchorRef={nameRef} role="menu" ariaLabel={`${name} — go to`}>
              <nav data-cg-window-menu-list="" aria-label="Go to">
                {tabs.filter((t) => !t.soon).map((t) =>
                  t.href ? (
                    <Fragment key={t.key}>
                      {renderLink({ href: t.href, 'data-cg-window-tab': 'menu', 'aria-current': t.current ? 'page' : undefined, onClick: () => setMenu(false), children: <>{t.label}{t.current && <Check size={12} weight="bold" aria-hidden />}</> })}
                    </Fragment>
                  ) : (
                    <button key={t.key} type="button" role="menuitemradio" aria-checked={!!t.current} data-cg-window-tab="menu" onClick={() => { setMenu(false); t.onSelect?.() }}>
                      {t.label}
                      {t.current && <Check size={12} weight="bold" aria-hidden />}
                    </button>
                  ),
                )}
              </nav>
            </Popover>
          </span>
        ) : null}
      </span>
      {tabs?.length ? (
        <nav data-cg-window-tabs="" aria-label={`${name}'s parts`}>
          {tabs.map(tabEl)}
        </nav>
      ) : null}
      {modes?.setup && (
        <button
          type="button"
          data-cg-window-tab=""
          data-cg-window-setup=""
          aria-pressed={inSetup}
          aria-label={inSetup ? `${MODE_LABEL.setup} — leave` : MODE_LABEL.setup}
          title={MODE_LABEL.setup}
          onClick={() => onMode?.(inSetup ? null : 'setup')}
        >
          {MODE_ICON.setup}
        </button>
      )}
      {shown.length > 0 && (
        <span data-cg-window-modes="" role="toolbar" aria-label={`${name} modes`}>
          {shown.filter((m) => m !== 'search').map((m) => (
            <IconButton
              key={m}
              icon={MODE_ICON[m]}
              label={mode === m ? `${MODE_LABEL[m]} — leave` : MODE_LABEL[m]}
              size="md"
              variant="ghost"
              active={mode === m}
              data-cg-window-mode={m}
              onClick={() => onMode?.(mode === m ? null : m)}
            />
          ))}
          {/* SEARCH IS ONE CONTROL (Feather, 2026-10-21): the glyph itself widens into the field — it keeps its place at the
              field's left end, and the field grows rightward as the query does. Nothing new appears beside it */}
          {shown.includes('search') && (
            <span
              data-cg-window-searchbox=""
              data-open={searchOpen || undefined}
              style={{ '--cg-window-q': Math.min(query?.length ?? 0, 60) } as CSSProperties}
            >
              <button
                type="button"
                data-cg-window-mode="search"
                aria-label={searchOpen ? `${MODE_LABEL.search} — leave` : MODE_LABEL.search}
                aria-pressed={searchOpen}
                title={MODE_LABEL.search}
                onClick={() => setSearch(!searchOpen)}
              >
                {MODE_ICON.search}
              </button>
              {searchOpen && (
                <>
                  <input
                    ref={field}
                    type="search"
                    value={query}
                    placeholder={searchPlaceholder ?? `Search ${name}`}
                    aria-label={searchPlaceholder ?? `Search ${name}`}
                    onChange={(e) => onQuery?.(e.target.value)}
                  />
                  {query ? (
                    <IconButton icon={<X weight="bold" />} label="Clear search" size="sm" variant="ghost" onClick={() => { onQuery?.(''); field.current?.focus() }} />
                  ) : null}
                </>
              )}
            </span>
          )}
        </span>
      )}
      <span data-cg-window-spacer="" />
      {(show || end) && (
        <span data-cg-window-end="">
          {show && <span data-cg-window-show="">{show}</span>}
          {end}
        </span>
      )}
    </div>
  )
}

export interface WindowProps extends WindowBandProps {
  /** the open mode's panel, beside the body inside the window (Adjust's live panel) */
  panel?: ReactNode
  children?: ReactNode
  /** the window's root element class */
  windowClassName?: string
}

/** The assembly: a glass window with its band, the open mode's panel and the body. */
export function Window({ panel, children, windowClassName, ...band }: WindowProps) {
  const tint = band.app ? appColor(band.app) : band.color
  return (
    <section
      data-cg-window=""
      data-mode={band.mode ?? undefined}
      className={windowClassName}
      style={tint ? ({ '--cg-window-app': tint } as CSSProperties) : undefined}
      aria-label={band.name}
    >
      <WindowBand {...band} />
      <div data-cg-window-room="">
        {panel && <aside data-cg-window-panel="">{panel}</aside>}
        <div data-cg-window-body="">{children}</div>
      </div>
    </section>
  )
}
