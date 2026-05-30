# cgos-ui — Common Garden design system package

Shared design tokens, atoms, and visual primitives consumed by **cgos** (FastAPI backend + frozen Vite dashboard), **cmngrdn** (Next.js HQ + public site — the active surface), **feather** (feather.fm), and **reliquary** (reliquaryarchives.com).

This file is the conventions doc for working **inside** this repo. For consumption patterns + install instructions see [README.md](README.md). For the multi-phase unification history see [`cgos/docs/design-system-unification-plan.md`](https://github.com/cmngrdn/cgos/blob/main/docs/design-system-unification-plan.md).

## Design authority — read this first

**cgos-ui is the cross-repo design authority for the entire Common Garden system.** Any design / UI / visual-language decision — a new component, a button restyle, a color choice, a token, a layout pattern, a Google or Apple branded surface — MUST be cross-referenced here, even when the implementation lives in a consumer repo (cmngrdn, cgos, feather, reliquary).

The rule, in order of preference:

1. **First choice — the atom lives here.** If it's pure presentation (no auth, no fetch, no project-specific business logic) it gets built in `ui/` / `lib/` / `passes/` / `preview/` and imported from `cgos-ui/...`. Every consumer pulls from one place; bug fixes / token changes propagate via `npm install`.
2. **Second choice — the atom lives in a consumer, but is documented here.** When the component bundles project-specific behavior (a download endpoint, an auth header fetch, a cgos API call) that can't reasonably live in cgos-ui, the component stays in the consumer repo. But it MUST get a row in the "Atom inventory" table below, marked with its home repo. The visual contract is locked here regardless of where the code lives. If the visual part can be split out as a pure-presentation badge atom, do that — keep the badge here, compose the data wrapper in the consumer.
3. **Never — silent duplication.** Two copies of the same UI element across repos with slightly-drifted styles is the failure mode every section of this doc exists to prevent.

When in doubt: open this file before reaching for `style={{}}`. Search the inventory table for what you need. If it's not there and you're about to build it, the build belongs here.

## Repo role

- Single source of truth for **tokens** (`tokens.css`), **base utility classes** (`base.css`), and **v1 atoms** (`ui/`, `lib/`, `passes/`, `preview/`).
- No deploy. Consumed via `npm install github:cmngrdn/cgos-ui` (or pinned to `#<sha>` for production).
- No npm publish. The GitHub URL is the distribution channel; that lets cgos and cmngrdn both pin to commits independently while staying interoperable.
- No CONTEXT.md / SCOPE.md here — those live in cgos as the hub. Any cgos-ui work that needs scoping shows up as a row in `cgos/SCOPE.md`.

## Hard rules

- **Tokens are the source of truth.** If a consumer needs a color/space/motion value, it has to be a `--cg-*` token. New tokens land in `tokens.css` first; consumers reference them by var name. Never inline hex/rgba in atom CSS.
- **Atoms are presentational.** No data fetching, no auth checks, no business logic. If an atom needs context, it takes props.
- **One atom per concept.** If the same UI element shows up in two consumers with subtle styling differences, it's a missing atom variant, not a reason to fork.
- **Cross-consumer changes ship through this repo.** Don't patch a copy in cgos or cmngrdn — change the atom here, bump the version, both consumers update.
- **Mirror types live here.** `lib/dossier.ts`, `lib/pass-art.ts` and similar shared TypeScript types are owned by cgos-ui and re-exported by both consumers via shim files. Never define the canonical type in a consumer.
- **Carrier-locked consent text is canonical here.** `lib/consent.ts` owns every SMS/email opt-in checkbox string + every auto-reply message (WELCOME, HELP, STOP, START) + the SMS footer template. Consumers (cmngrdn `<CaptureForm>` + `/sms` page + cgos `awen/routers/sms.py` Twilio webhook) ALL import from here so the text never drifts across surfaces — carrier reviewers cross-check the consent screen against the public disclosure page against the welcome SMS they receive, and any mismatch bounces the campaign. Edits to the strings in `lib/consent.ts` require resubmission of every active A2P 10DLC + RCS campaign; don't change them casually. cgos's Python backend can't import TS, so it hand-maintains a MIRROR at `~/cgos/awen/legal/consent.py` — same function names, identical output. Edits must land in both files in the same PR. Dynamic args (`brandName`, `messageTypes`, `frequency`, `supportEmail`) interpolate per call; the carrier-locked frame (CTIA disclosures + ordering + punctuation) is in the function bodies. New workspace tiers needing distinct message-type defaults extend `DEFAULT_MESSAGE_TYPES_BY_KIND`.

## Single source of truth atom inventory

Tokens + base utility classes + v1 atoms. To add or change a token, edit `tokens.css`, push, then `npm install` in consumers (or `npm link cgos-ui` for live local iteration).

| Need | Import from | Notes |
|------|-------------|-------|
| Pill / filter chip / segmented toggle | `cgos-ui/ui/ControlChip` → `ChipToggle`, `ChipSelect`, `ChipMultiSelect`, `ChipGroup`+`ChipSegment` | 28px height, the only pill atom. Do not roll your own. `ChipSelect` for single-select (sort, lens, view); `ChipMultiSelect` for filters where 2+ values make sense (status, tag, channel). Multi auto-shows a search-within input when options > 8. **`ChipGroup` accepts `size`: `sm` (default, 28px filter-row) or `md` (40px form-body segmented control matching Input/Select md). Use `md` whenever the group sits in a form body alongside text inputs.** Size flows down to nested `ChipSegment`s via context — never set it on individual segments. |
| Text button (any action) | `cgos-ui/ui/Button` | Variants: `primary` (accent fill, **default**), `ghost` (surface fill + border), `accent` (accent-outlined), `danger` (red-tinted), `link` (bare accent text), `glass` (frosted-floating; opt into circular via `pill` boolean). Sizes: `xs` (24px) / `sm` (32px) / `md` (40px, default) / `lg` (48px hero CTA). Loading state, iconLeft/iconRight, fullWidth. HIG press depression. Pass `href` to render as `<a>`. |
| Icon-only button | `cgos-ui/ui/IconButton` | Variants: `ghost` (default), `subtle`, `accent`, `danger`. Sizes: `xs` (16px, skips hover-bg lift), `sm` (24px), `md` (32px, default), `lg` (40px). Always pass `label` for a11y. CSS pseudo-state hover, focus-visible ring, HIG press scale(0.95), `active` toggle (aria-pressed). Replaces every `<button style={{ all: 'unset' }}>` with an icon. |
| Toggle / switch | `cgos-ui/ui/Toggle` | Sizes: `md` (32×18, default) / `sm` (26×14). Tones: `accent` / `success` / `warning` / `danger`. Optional `label` renders as a clickable row. `role="switch"` + `aria-checked` baked in. |
| Status pill / badge / count label | `cgos-ui/ui/Badge` | Tones map to `--cg-status-*` tokens (8 tones). Variants: `subtle` (default), `outline`, `solid`. Sizes: `sm`/`md`. Optional `dot` + `uppercase`. Never inline a status color. |
| Centered modal / dialog / wizard | `cgos-ui/ui/Modal` | Portal-rendered, click-outside + Esc close. **Glass-frosted backdrop**; surface itself is opaque by design. `cg-modal-fade` + `cg-modal-rise` keyframes ship in `base.css`. |
| Translucent glass surface (popover / dropdown / drawer / sidebar) | `cgos-ui/ui/GlassSurface` | Liquid Glass primitive. Variants: `frosted` (default), `clear`, `tinted` (pass `tintColor`), `chrome`. Elevation `0..5` maps to `--cg-elev-*`. Every variant + elevation includes a rim highlight composed via `--cg-glass-border-top`. Radius preset `'sm' \| 'md' \| 'lg' \| 'pill'` or any CSS length string. `as` prop for semantic HTML. `forwardRef`-enabled. Pure inline-style — atom is presentational; layer interaction states in the consumer. |
| Empty state | `cgos-ui/ui/EmptyState` | Icon + title + description + optional action. Sizes `sm`/`md`. |
| Spinner | `cgos-ui/ui/Spinner` | `sm`/`md`/`lg`/`xl`. Default tint `--cg-accent`, override via `color` prop. Uses shared `cg-spin` keyframe. |
| Progress bar | `cgos-ui/ui/ProgressBar` | `value` 0–100 or `indeterminate`. 5 tones. `cg-progress-indeterminate` keyframe in `base.css`. |
| Text input / textarea | `cgos-ui/ui/Input` → `Input` (sm/md sizes) + `Textarea` (rows-controlled) | Background `--cg-bg`, 1px hairline border, accent-dim on `:focus`, accent ring on `:focus-visible`, `--cg-disabled-opacity` when disabled, `[aria-invalid="true"]` red border. |
| Native select dropdown | `cgos-ui/ui/Select` | Native `<select>` wrapped in a `position:relative` `<span>` so the disclosure chevron renders as an overlay `<svg>` (not a background-image data URL). `currentColor` + `var(--cg-text-secondary)` so the chevron stays visible across light/dark workspaces. sm (12px chevron, 32px tall) + md (14px chevron, 40px tall). For chip-style multi-option dropdowns prefer `ChipSelect`. |
| Card surface | `cgos-ui/ui/Card` (React wrapper) OR `.cg-card` / `.cg-card-interactive` (className) | Variants: `resting` + `interactive` (hover lift + press snap + focus ring). Polymorphic via `as` prop including `as="button"` (auto-resets default button styling). Don't pair with `style={{ all: 'unset' }}`. |
| FieldDot indicator | `cgos-ui/ui/FieldDot` | "Lit up" form-field indicator — neutral grey when empty, accent with glow when filled, 200ms transition. Sizes `sm`/`md`/`lg`. |
| Pulse summary drilldown card | `cgos-ui/ui/PulseSummaryCard` | Inspector-Details drilldown atom — compact analytics card with eyebrow / title / 1-3 metric cells (value + label + optional delta with up/down/flat tone) / optional bar sparkline / "View in Pulse →" affordance. Composes `.cg-card-interactive` (hover lift + press snap + focus ring). Renders as `<button>` when `onOpen` is set so keyboard activation works without wiring. **Pure presentational** — caller pre-resolves data + passes via props (no SDK fetch in the atom; that's the consumer's hook). Built-in `loading?` + `empty?` states so the card chrome doesn't flash in/out as data resolves. Use inside an inspector's Details tab as a doorway to the entity's canonical Pulse view (Phase 3 of the inspector redesign — see `cmngrdn/docs/inspector-toggle-redesign.md` §4). Drilldown push is wired by the host inspector body's `onOpen` handler (typically `inspector.pushInspector({ tabs: [...<EntityPulseView />...] })`). |
| Journey summary drilldown card | `cgos-ui/ui/JourneySummaryCard` | Inspector-Details drilldown atom — compact chronological feed with eyebrow / title / optional subtitle / 3-5 event rows (icon circle + label + sub-meta + pre-formatted timestamp) / "View full timeline →" affordance. Voice-agnostic — caller resolves the label voice (operator "Inquiry submitted" vs member "You submitted an inquiry"). Same chrome treatment as `<PulseSummaryCard>` (`.cg-card-interactive`, button when interactive). **Pure presentational** — `events: JourneyEventPreview[]` passed in pre-resolved. Built-in `loading?` + `empty?` states. Use inside an inspector's Details tab as a doorway to the entity's canonical Journey timeline. Drilldown push handled by host's `onOpen`. |
| Long-list virtualization (1,000+ rows) | `cgos-ui/ui/VirtualList` | Renders only the rows in the visible window + overscan buffer, regardless of dataset size. First-paint cost is bound to the viewport, not the row count — a 50,000-row list mounts in the same time as a 50-row list. Use on every `/hq/*` long-list surface (Audience confirmed, Inquiries / Appointments / SMS Inbox queued — anywhere row count can grow past a few hundred). Pure presentational, zero external deps, no `@tanstack/react-virtual` (kept the package dep-free). Locked constraints: **fixed-height rows only** — caller passes `rowHeight` in pixels and every row must render at exactly that height (HQ list spec is uniform per `cgos-ui/docs/list-row-template.md`, so this works for every existing surface); **container owns its scroll** — caller gives it a bounded height (typically `flex: 1` inside the page or an explicit `maxHeight`), not nested inside an already-scrolling parent; vertical only. Props: `count`, `rowHeight`, `renderRow(index)`, `overscan` (default 6). Uses passive scroll + ResizeObserver internally. |
| Loading-shimmer placeholder | `cgos-ui/ui/Skeleton` | Shimmer block sized to the content it stands in for (`width`/`height` number→px or any CSS length; `circle` for avatars; `radius` override). References the `cg-shimmer` keyframe in `base.css`; carries `.cg-skeleton` so the base-css `prefers-reduced-motion` guard swaps the shimmer for a static fill. Match the loading content's silhouette so layout doesn't jump. Part of the Pulse analytics kit (`docs/pulse-analytics-design.md` §6.3). |
| Expand/collapse section | `cgos-ui/ui/Collapsible` | Header (`trigger`, always visible, toggles on click) + smoothly-animated body via the `grid-template-rows: 0fr→1fr` technique (no JS height measurement). Controlled (`open`+`onOpenChange`) or uncontrolled (`defaultOpen`). `aria-expanded`/`aria-controls` baked in. Body wrapper carries `.cg-collapsible-content` so the reduced-motion guard drops the transition. Built for the Pulse "collapsed strip above the list → opens to the full chart" pattern. |
| Chart/panel error state | `cgos-ui/ui/ChartError` | Compact danger-tinted inline error (`message` + optional `onRetry` button) sized to a failed analytics panel's footprint, so one chart can fail without taking the page down. Self-contained (no CSS dependency — the Retry control is a minimal inline button). Sizes `sm`/`md`. Promotes the copy-pasted `ErrorState` from cmngrdn's analytics Bodies into one atom. |
| Single-metric stat tile | `cgos-ui/ui/StatTile` | Compact `value` (pre-formatted — atom does no number formatting) + `label` + optional `delta` (with explicit `tone` up/down/flat, because "up" isn't always good). `accent` colors the value; set `onClick` to make it a filter control (renders as `<button>`, `selected` adds the accent cross-filter ring). The unit cell of a Pulse summary row (Audience health strip). Generalizes cmngrdn's `OverviewBody` TileCard. |
| Linked-entity drilldown card | `cgos-ui/ui/LinkedEntityCard` | Inspector-Details drilldown atom — identity-strip card with `kind` eyebrow ("Contact" / "Appointment" / "Inquiry") + optional avatar (round person tile or square workspace sigil) + title + sub-meta + optional badge + "→" affordance. Use to navigate from one entity inspector to a related entity's canonical inspector. Same chrome treatment as the other drilldown cards. **Pure presentational** — caller resolves the related entity's identity strip + the click handler (typically `inspector.pushInspector({ ...canonical body... })`). Atom doesn't lookup kind→inspector mapping; that's the caller's concern. Built-in `loading?` + `empty?` states. |
| "Continue with Google" button | `@/components/auth/GoogleSignInButton` in **cmngrdn** (hoist candidate) | CANONICAL Google sign-in button across every auth surface. 4-color G logo + "Continue with Google" label. Variants: `surface` (legacy cgos dashboard look — muted bg + hairline border, secondary action) and `solid` (inverted, primary-CTA contexts). Standalone `<GoogleGlyph>` exported for non-button surfaces. Brand-identity hex literals (`#EA4335 / #4285F4 / #FBBC05 / #34A853`) locked by Google's identity guidelines. Mounted in cmngrdn on `/hq/sign-in`, `/join`, `<ReturningMemberPrompt>`, `<GardenPassCTA>`. Lives in cmngrdn today; visual atom is hoist-ready when a second consumer needs it. Never hand-roll a Google button anywhere — extend this. |
| "Add to Apple Wallet" button | `@/components/hq/vault/AddToWalletButton` in **cmngrdn** (data-aware wrapper) | CANONICAL Apple Wallet install CTA. Bundles cgos `GET /api/passes/download` fetch + auth header + blob→download + iOS Safari Wallet-sheet handoff + the full error-message ladder (401/403 → re-sign-in nudge, 503 → cert-config message). Aesthetic mirrors Apple's official "Add to Apple Wallet" badge: black surface, white Apple logo, two-line "ADD TO / Apple Wallet" label in SF Pro, identity-locked colors. Variants: `pill` (full badge) and `inline` (compact text-link). Mounted in cmngrdn on `<ArtPieceInspector>` Design tab, `<HeldPassesSection>`, `<GardenPassCTA>` signed-in state. The visual badge could split into a pure-presentation `AppleWalletBadge` atom here if a second consumer needs it; for now the visual contract is locked in this row. Never hand-roll an Apple Wallet button — extend this. |
| Tab (page header / inspector sub-tabs / any tab surface) | `@/components/hq/tabs/HqTab` in **cmngrdn** (hoist candidate) | CANONICAL single-tab primitive. Locked visual: tabbed-outline look (rounded top corners `var(--cg-radius-md)` + elevated bg `var(--cg-bg-elevated)` + 2px accent underline + 600 weight on active; transparent/muted on inactive). `margin-bottom: -1px` overlap trick makes the active underline TOUCH the chrome divider beneath — parent container MUST set `align-items: flex-end` for this to work. Link or button variants (set `href` for Next.js `<Link>` with prefetch + pending pulse). Used internally by cmngrdn's `<PageHeader>` (top-level page nav) AND `<SubTabs>` (inspector sub-tabs) so both surfaces share one vocabulary. **Hoist-ready** — pure presentational, no consumer-specific logic; lift to `cgos-ui/ui/HqTab` when cgos dashboard's tab surface needs the same primitive. See cmngrdn CLAUDE.md → "Unified Chrome System" + "Inspector Contract → Tab discipline". |
| Inspector chrome system (drawer + header + preview/edit composer) | `@/components/hq/inspector/*` in **cmngrdn** (context-bundled, stays put) | CANONICAL `/hq/*` inspector chrome — drawer/sheet shell + slot routing + preview/editor split + framing. Bundles `InspectorContext` state + `useOptimisticSave` integration + auto-derived View public / Copy link actions (from `preview.previewUrl`). Three frame policies — `page` (default; phone frame on desktop, edge-to-edge on mobile, mobile/desktop toggle), `artifact` (centered card preview for passes / collectibles), `desktop-only` (admin tooling). Two routing patterns — Pattern A (simple `preview` + `editContent` slots) and Pattern B (tabbed body owns slots per-tab). **Typed `actions: InspectorAction[]` slot renders as 24px icon-only squares via `<IconButton size="sm">` + the library-row chip treatment (`border: 1px solid var(--cg-border)` + `background: var(--cg-bg-surface)` + `border-radius: var(--cg-radius-sm)`) — same atom + same visual vocabulary as the `/hq/library/*` `<CardListRow>` action buttons, so small-symbol affordances read as one system across the platform. Labels become `aria-label` + hover `title` only, never visible. `placement: 'overflow'` actions always fold into a ⋯ dropdown (no width-based reflow); dropdown items DO render icon + label.** Segmented View|Edit toggle stays text-bearing at 28px because it's a mode SELECTOR, not an action button — different vocabulary intentional. Held in cmngrdn because the chrome bundles cmngrdn-specific context + cgos SDK calls; visual contract is locked here regardless. See cmngrdn CLAUDE.md → "Inspector Contract → Header action vocabulary" for the complete spec + the 7-point checklist for adding new chrome surfaces. |
| Inspector body states (loading / empty / error) | `@/components/hq/inspector/InspectorBodyState` in **cmngrdn** (hoist candidate) | CANONICAL centered body-state primitives — `<InspectorBodyLoading label?>` (spinner + label), `<InspectorBodyEmpty title hint? icon? action?>` (icon + heading + hint + CTA, mirrors `<EmptyState>` rhythm), `<InspectorBodyError message onRetry?>` (red-tint badge + message + retry button). Drop-in replacements for every centered "Loading…" span across inspector bodies. **Hoist-ready** — pure presentational; could move to `cgos-ui/ui/InspectorBodyState` if cgos dashboard wants the same vocabulary. |
| Preview frames (mobile + desktop) | `cgos-ui/preview/MobileFrame` + `cgos-ui/preview/DesktopFrame` (raw atoms) **PLUS** `@/components/hq/preview/*` in **cmngrdn** (scaled + frame-policy-aware wrappers) | Raw `MobileFrame` (393×852 iPhone shell with status bar + Dynamic Island + Safari pill) + `DesktopFrame` (1280×800 page surface, no chrome — Vite dashboard legacy, mostly unused on cmngrdn). cmngrdn wraps them in `<ScaledMobileFrame>` + `<ScaledDesktopFrame>` (uniform-scale via shared `useScaleToFit` ResizeObserver) + `<InspectorPreviewPane>` (frame-policy router). **In cmngrdn, raw frame imports are ESLint-banned outside `src/components/hq/preview/`** — every consumer goes through `<InspectorContent>` so framing rules + viewport toggle + mobile-screen edge-to-edge treatment stay locked in. Mirror this guard in any new consumer that mounts the raw atoms. |
| List row + grid tile (every `/hq/*` list surface) | `@/components/hq/list/*` in **cmngrdn** (hoist candidate) — `<UniversalListRow>` + `<UniversalTile>` | CANONICAL list-row primitive for every `/hq/*` module list. Locks the 3-zone grammar (3px status spine left edge, 40px thumb + name + sub-meta body, right-anchored progress/time/none + up to 2 disabled-when-N/A action buttons), the row-height contract (64px desktop / 72px mobile), and the no-chips-in-rows hard rule. Tile sibling locks the top-spine + thumb + name + bottom-slot grid skeleton. Thumb supports image / Phosphor icon / typographic mark / color swatch. Right anchor variants — `progress` (Library, Missions, Transmissions-draft, Offerings), `time` (Appointments, SMS, Activity, Chat, Admin Tasks, Transmissions-sent), `none` (Audience, Tags, Members). Status spine maps to existing `--cg-status-*` tokens via a per-module `statusToSpine()` helper in `src/lib/card-adapters/spine.ts`. Mobile collapses both action slots (consumers handle overflow via `usePageAction` drawer or rely on tap-to-inspect). **Hoist-ready** — pure presentational, no auth/fetch; lift to `cgos-ui/ui/UniversalListRow` + `cgos-ui/ui/UniversalTile` once cgos dashboard adopts the same primitive (or once the cmngrdn sweep across all modules is complete). See **[`docs/list-row-template.md`](docs/list-row-template.md)** for the full contract: 3-zone grammar, variant rules, per-module field-mapping matrix, hard rules. Never roll a custom row CSS skeleton inside a module — per-module variation lives in props (sub-meta content, thumb kind, status token), not in module CSS. |

## Token surface

Tokens live in `tokens.css` under `:root` (dark default) + `:root[data-theme="light"]` (light overrides).

- **Color:** `--cg-bg`, `--cg-bg-elevated`, `--cg-bg-surface`, `--cg-text`, `--cg-text-secondary`, `--cg-text-dim`, `--cg-text-muted`, `--cg-border`, `--cg-border-hover`, `--cg-border-subtle`, `--cg-accent`, `--cg-accent-dim`, `--cg-accent-glow`, `--cg-accent-subtle`, `--cg-backdrop`.
- **Status palette:** `--cg-status-success / warning / danger / blue / purple / neutral / archived / green / red / amber / cyan / magenta`. Consumed via `types/status.ts` maps in consumer repos.
- **Data-viz palette (Pulse charts):** `--cg-data-1..6` (categorical series colors — blue/orange/emerald/violet/magenta/gold, colorblind-aware), `--cg-data-reachable / -reachable-sms / -both / -unreachable` (fixed semantics for the audience opt-in ladder), `--cg-data-grid` + `--cg-data-track` (chart chrome). Re-pointed deeper in the light block so fills clear the ~3:1 non-text contrast floor on cream. Charts are ALSO themed per-module via an `accent` prop — these are the palette *independent* of module color. Spec: `cmngrdn/docs/pulse-analytics-design.md`.
- **Glass system:** `--cg-glass-bg`, `--cg-glass-bg-strong`, `--cg-glass-blur`, `--cg-glass-blur-strong`, `--cg-glass-border-top` (rim highlight, `var(--cg-text) 38%`), `--cg-glass-border-strong`, `--cg-glass-radius-sm/md/lg/pill`.
- **Elevation:** `--cg-elev-0` through `--cg-elev-5` — five-tier shadow scale.
- **Typography classes:** `.cg-text-hero/display/title/body/small/label/label-sm/micro/mono/caption/callout`. Prefer these over inline `fontSize`/`fontWeight`.
- **Motion easings:** `--cg-ease-entry` (decelerate, *appearing* surfaces), `--cg-ease-exit` (accelerate, *dismissing* surfaces), `--cg-ease` (bidirectional state changes), `--cg-ease-emphasize` (rare HIG featured motion).
- **Chrome heights** (currently defined in `cmngrdn/src/app/globals.css`, **hoist candidates** — should move to `tokens.css` here once stabilized): `--hq-chrome-height: 48px` (primary chrome rows — sidebar header / page header / inspector header) + `--hq-chrome-subrow-height: 40px` (secondary chrome rows — sub-tabs / filter strips / viewport toggle bars). 48px matches the iOS-nav-bar / Material-dense-AppBar sweet spot. Every chrome surface across `/hq/*` locks to these so hairlines + heights align on one horizontal grid. See cmngrdn CLAUDE.md → "Unified Chrome System" for the full rule set.

## Hard rules in consumers (enforced in review)

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

## Inspector Contract — cross-repo authority

The chrome rules below are authoritative for every consumer building an inspector / drawer / sheet surface. The implementation lives in cmngrdn (`@/components/hq/inspector/*` + `src/contexts/InspectorContext.tsx`) and is the reference. Full implementation spec + per-surface migration playbook lives at `cmngrdn/docs/inspector-toggle-redesign.md`. This section captures the locked design contract — what every consumer MUST honor regardless of repo.

**Locked 2026-05-16, cross-repo authority assigned 2026-05-25 after cmngrdn Phase 5 complete.**

### Architectural model

- **Modules are system engines.** Each `/hq/*` module is its own application layered over the same data (Pulse, Journey, Dispatch, Library, Vault, Service, Scanner, etc.). Inspectors are NOT a separate module — they're the entity-window pattern that every module composes when an operator clicks into a row.
- **Inspectors are entity windows.** They hold ENTITY aspects (Details / Content / Preview / Variants / Activity / Thread / Linked / Settings). Drilldowns are the door between modules and inspectors.
- **Drilldowns push onto the inspector history stack** and land in the **canonical view** of that module/entity. No duplicated views — shared components only. The Contact inspector you reach by drilling from Inquiry IS the same Contact inspector you'd open from Audience.

### Chrome shape

```
┌──────────────────────────────────────────────────────────┐
│ [‹]  Title                  [Actions]   [⛶]   [×]        │  header
├──────────────────────────────────────────────────────────┤
│ [Details]  [Content]  [Preview]  [Settings]               │  tabs (≤4)
├──────────────────────────────────────────────────────────┤
│           body — whatever the active tab renders          │
└──────────────────────────────────────────────────────────┘
```

- **`‹` back button** — visible when `canGoBack === true`. Pops the history stack.
- **Title + Eyebrow** — entity name.
- **Actions slot** — typed `InspectorAction[]`. Auto-derived View public / Copy link when `preview.previewUrl` is set. Renders as **24px icon-only squares** via `<IconButton size="sm">` + the library-row chip treatment (`border: 1px solid var(--cg-border)` + `background: var(--cg-bg-surface)` + `border-radius: var(--cg-radius-sm)`) — same atom + same visual vocabulary as `/hq/library/*` `<CardListRow>` action buttons. Labels become `aria-label` + hover `title`, never visible. `placement: 'overflow'` always folds into a ⋯ menu (no width-based reflow). Dropdown items DO render icon + label.
- **`⛶` Expand** — universal size control. Drawer (~480px) ↔ fullscreen takeover. **Decoupled from edit mode** — expand is its own affordance, NEVER auto-fires on edit.
- **`×` close** — clears inspector + entire stack.
- **Tab strip** — composes `<HqTab>` (in cmngrdn at `@/components/hq/tabs/HqTab`; hoist candidate). Max 4 tabs per surface; horizontal scroll on mobile if overflow.

### Routing patterns (Pattern A / Pattern B)

Two patterns; chrome supports both transparently. New inspectors pick one.

**Pattern A — canonical preview + edit composition.** Chrome auto-composes when you pass `preview` + `editContent`. View mode renders `viewContent ?? preview` framed; edit mode renders preview-left + editor-right via `<PreviewEditorSplit>`. Most surfaces use this (portal pages, transmissions, inquiry forms, collectibles).

**Pattern B — tabbed body with per-tab routing.** Pass `content` (the tabbed body) + `canEdit`; DO NOT pass `editContent`. Body reads `activeTabId` + `mode` from `useInspector()` and renders per-tab view/edit content internally. Each tab may mount its own `<InspectorContent>` if it wants the preview/edit split. Used by surfaces with multiple top-level sub-concerns where each may have its own editor — e.g. Vault Passes `<ArtPieceInspector>` (Design / Eras / Tiers / Notifications / Analytics).

### Preview slot + framePolicy

The `preview` slot at `openInspector()` time declares an explicit framePolicy. Chrome owns the framing — bodies NEVER wrap previews themselves.

- **`page`** (default) — visitor-facing page preview. Desktop screen + mobile viewport = iPhone frame; desktop viewport = 1280×800 (or 1440×900 when `desktopNaturalWidth: 1440`). Mobile screen = edge-to-edge in the bottom sheet (device IS the frame). Mobile/desktop viewport toggle visible on desktop only. Used by portal pages, transmissions, inquiry forms.
- **`artifact`** — identity / card preview without a device context. Centered on a neutral surface, no chrome, no toggle. Same treatment on every screen. Used by Vault Collectibles.
- **`desktop-only`** — surfaces that only make sense at desktop width (admin tooling, full-bleed dashboards). Always renders in desktop frame. No toggle. Reserved.
- **`mobile-only`** — surfaces whose audience consumes them on a phone (Apple Wallet passes, iOS push notifications, future SMS conversations). Always renders in iPhone frame on desktop; edge-to-edge on mobile screens. No toggle. Used by Vault Passes.

### Tab discipline

Canonical role set (pick ≤4 per surface; document exceptions):

1. **Overview / Identity** — summary, status, metadata. Optional; skip when the editor IS the natural landing.
2. **Editor** (or domain-specific name — Builder / Design / Compose) — work surface. Pattern A surfaces usually skip this (edit-mode chrome covers it).
3. **Preview** — visitor's view. Routes through `useInspector().preview` + `<InspectorContent>`.
4. **Analytics** — data after-the-fact. Empty state until data exists.
5. **Settings** — config knobs that aren't part of the editor.

Use canonical role names where they fit. Don't invent "Stats" when "Analytics" works.

### Visual treatment + container rules

These rules are enforced. Breakage means drift across the platform.

- **Tab active state** — rounded top + elevated `--cg-bg-elevated` background + 2px accent underline + 600 weight. Inactive = transparent + transparent underline + 500 weight + muted text.
- **Active underline MUST touch the divider beneath the tabs row.** `<HqTab>` sets `margin-bottom: -1px` to overlap. Parent container MUST set `align-items: flex-end` (or `align-self: flex-end` on the tabs row inside). Without that, the underline floats above the line.
- **Container background cannot match active tab background.** Container = `var(--cg-bg)` or `transparent`. NEVER `var(--cg-bg-elevated)` (that's what active tab uses; container + active tab would visually merge).
- **All chrome heights use `--hq-chrome-height` (48px primary) or `--hq-chrome-subrow-height` (40px sub-rows).** Sidebar header, page header, inspector header, tab strips, filter strips — all on the same Y when stacked. Don't pick a one-off number.
- **All chrome bottom borders use `var(--cg-glass-border)`.** Content surfaces use `var(--cg-border)` (heavier definition).
- **Flex-pin shell pattern.** `.hq-module-shell` is `display: flex; flex-direction: column; height: 100%; overflow: hidden`. Direct children that aren't `.page-header` or `.hq-module-chrome` become the scrolling body. Chrome is structurally unable to scroll.

### When to skip these rules

You don't. If a surface needs a different chrome shape, the conversation is "should we change the rules?" not "should I roll a one-off." Bring it back to this section.

## Versioning + consumption

`package.json` `version` bumps follow:
- **Patch (0.20.x):** bug fixes, no API change.
- **Minor (0.x.0):** new atom, new variant, new token. Backwards-compatible.
- **Major (x.0.0):** breaking change to an atom's prop signature or a token rename. Coordinate consumer updates.

Both cgos and cmngrdn consume from `github:cmngrdn/cgos-ui`; they pin via `package.json` `dependencies`. To live-iterate locally, `cd cgos-ui && npm link` then `cd ../cgos/dashboard && npm link cgos-ui` (and similarly for cmngrdn).

## Don't do

- Don't add a CONTEXT.md or SCOPE.md to this repo. Hub conventions live in cgos.
- Don't add a README that duplicates this file. README is for "how do I install + use this"; CLAUDE.md is for "how do I work inside this repo."
- Don't extract atoms back to a consumer repo. New atoms land here first.
- Don't define a shared TypeScript type (Dossier, PassArt, etc.) in a consumer. Define here, re-export from consumers.
