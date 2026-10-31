# Hard rules in consumers

What cmngrdn, feather, reliquary and any new front door must not do with this package — enforced in review and, where named, by ESLint in the consumer.

Moved out of `CLAUDE.md` on 2026-10-31 by audit pass 6 (Docs). The text is verbatim from the sections it replaced, except where a line is marked *(rewritten 2026-10-31)* because the code no longer matched it.

---

- **No hardcoded hex or rgba in `style={}` props or inline CSS.** Use tokens. If a token is missing, add it to `tokens.css` here first. Enforced by ESLint in cmngrdn + cgos: `no-restricted-syntax` selectors descending from `JSXAttribute[name.name='style']`.
- **No new raw `<button className="...">` for text/CTA buttons.** Use `<Button>`. Default variant is `primary`.
- **No new `<button style={{ all: 'unset' }}>` with just an icon.** Use `IconButton`.
- **No new inline switch/toggle built from `<button>` + dot div.** Use `Toggle`.
- **No new centered overlays built from scratch.** Use `Modal`.
- **No new status pill built from `<span style={{ padding, border, color: '#...' }}>`.** Use `Badge`.
- **No per-file `tabStyle()` or `btn()` helper functions.** Tab surfaces compose `HqTab` (lives in cmngrdn at `@/components/hq/tabs/HqTab`); reuse the consumer's `PageHeader` / `SubTabs` for page or inspector contexts. NEVER fork `tabStyle()` per surface — that's how PageHeaderTab + SubTabs drifted apart in cmngrdn pre-2026-05-16. The active-underline-touches-divider trick (`margin-bottom: -1px` + parent `align-items: flex-end`) lives in `HqTab` and breaks silently if you roll your own.
- **No `var(--cg-bg-elevated)` on a container that holds tabs.** `HqTab`'s active state uses `--cg-bg-elevated` for the tabbed-outline pop; matching the container bg makes the active tab visually merge with the row. Containers use `var(--cg-bg)` or `transparent` instead.
- **No chrome height that isn't `var(--hq-chrome-height)` or `var(--hq-chrome-subrow-height)`.** Sidebar header, main page header, inspector header, sub-tabs, filter strips all share these tokens so hairlines align on one Y across the app. Don't pick a different number for a one-off surface; change the token and accept the consequence everywhere.
- **No raw `cgos-ui/preview/MobileFrame` or `cgos-ui/preview/DesktopFrame` imports outside `src/components/hq/preview/` (or the equivalent wrappers folder in any consumer).** Every preview goes through `<InspectorContent>` → `<InspectorPreviewPane>` → the scaled wrappers so framing policy + viewport toggle + mobile-screen edge-to-edge treatment stay locked in. Enforced in cmngrdn by `no-restricted-imports` ESLint rule; mirror in any new consumer that builds an inspector.
- **One atom per concept.** If you catch yourself building a second version of something already in `ui/`, stop and extend the existing atom instead.
- **No hand-rolled glass.** If you are writing `background: color-mix(... --cg-bg-elevated ...)` next to a `backdrop-filter` and a hairline border, you are rebuilding `<GlassSurface>` — use it. This is not hypothetical: cmngrdn shipped for months with `<BloomIndex>` reproducing the `frosted` recipe line for line, `/studios` reproducing `clear` + `tinted`, and the Home widget chassis landing on flat `--cg-bg-surface`, while the atom itself had **zero consumers in the repo**. Sitting side by side in one grid they read as three different systems, because they were.
- **No card inside a card.** A surface contains fills, pills, chips and rows — never a second bordered/blurred/elevated surface. Using the *correct* atom in the wrong place still counts: `cg-card-interactive` nested inside a glass widget is the same mistake as hand-rolling one.
