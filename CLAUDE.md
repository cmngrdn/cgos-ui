# cgos-ui — Common Garden design system package

Shared design tokens, atoms, and visual primitives consumed by **cgos** (FastAPI backend + frozen Vite dashboard), **cmngrdn** (Next.js HQ + public site — the active surface), **feather** (feather.fm), and **reliquary** (reliquaryarchives.com).

This file is the conventions doc for working **inside** this repo. For consumption patterns + install instructions see [README.md](README.md). For the multi-phase unification history see [`cgos/docs/design-system-unification-plan.md`](https://github.com/cmngrdn/cgos/blob/main/docs/design-system-unification-plan.md).

## Design authority — read this first

**cgos-ui is the cross-repo design authority for the entire Common Garden system.** Any design / UI / visual-language decision — a new component, a button restyle, a color choice, a token, a layout pattern, a Google or Apple branded surface — MUST be cross-referenced here, even when the implementation lives in a consumer repo (cmngrdn, cgos, feather, reliquary).

The rule, in order of preference:

1. **First choice — the atom lives here.** If it's pure presentation (no auth, no fetch, no project-specific business logic) it gets built in `ui/` / `lib/` / `passes/` / `preview/` and imported from `cgos-ui/...`. Every consumer pulls from one place; bug fixes / token changes propagate via `npm install`.
0. **A NEW ATOM IS NOT REACHABLE UNTIL IT IS IN `exports`.** `package.json` lists every
   subpath explicitly (`"./ui/Button"`, `"./ui/Button.css"`, …), so a file added under `ui/`
   and shipped in a tagged release still fails to resolve in every consumer:
   `TS2307: Cannot find module 'cgos-ui/ui/X'`. Nothing in this repo catches it — the file is
   present, the build here passes, and the failure appears only in a consumer AFTER the tag has
   been cut and pinned. `TagListField` shipped in v0.51.0 that way and needed v0.51.1 the same
   minute. **Add the atom AND its companion `.css` to `exports` in the same commit as the file.**

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
- **AN ATOM'S RESTING STATE BELONGS IN ITS COMPANION CSS, NEVER IN AN INLINE `style` (v0.48.0, 2026-08-14).** A React `style` attribute beats every selector at every specificity, so an atom that styles itself inline **cannot be themed by a consumer at all** — which is not an override mechanism, it is the absence of one. Found in cmngrdn, whose inspector wanted its fields to read as editable text rather than as twenty bordered boxes: the consumer's rule matched the element, was the *only* matching rule for background / border-color / border-radius, and still lost. `!important` was the only door left, on an atom, in a design system.
  - **The shape:** static declarations go in `ui/<Atom>.css`, keyed off the `data-cg-*` attribute the element already carries. Variants become attributes a selector can see (`data-cg-size`), states become pseudo-classes (`:disabled`), and the `style` prop stays a per-instance escape hatch that still wins. `Button`/`[data-cg-button]` was always the model; `Input`/`Textarea` were converted to match.
  - **`style` as the documented override path is the smell.** `Input`'s own docblock used to offer it — "pass `style` to override per-instance" — which is true and which quietly meant no stylesheet could reach it. If you write that sentence, the atom is already wrong.
  - **This is NOT yet true across the package.** Audited 2026-08-14: of 29 atoms, only 8 have a companion CSS file (`Button` · `Composer` · `ControlChip` · `EntityChip` · `IconButton` · `Input` · `Select` · `Toggle`); the rest set their resting state inline, several heavily (`JourneySummaryCard` 21 blocks, `LinkedEntityCard` 19, `PulseSummaryCard` 19). **Converting them is a real project, not a sweep** — each needs its own verification against consumers, and this entry exists so the next person converting one knows the target shape rather than rediscovering it. **Convert an atom when a consumer actually needs to restyle it**; don't bulk-migrate untested.
  - **If a consumer reaches for `!important` against an atom, that is the ATOM's bug.** Fix it here and bump; don't leave the `!important` at the callsite.
- **One atom per concept.** If the same UI element shows up in two consumers with subtle styling differences, it's a missing atom variant, not a reason to fork.
- **Cross-consumer changes ship through this repo.** Don't patch a copy in cgos or cmngrdn — change the atom here, bump the version, both consumers update.
- **Mirror types live here.** `lib/dossier.ts`, `lib/pass-art.ts` and similar shared TypeScript types are owned by cgos-ui and re-exported by both consumers via shim files. Never define the canonical type in a consumer.
- **Carrier-locked consent text is canonical here.** `lib/consent.ts` owns every SMS/email opt-in checkbox string + every auto-reply message (WELCOME, HELP, STOP, START) + the SMS footer template. Consumers (cmngrdn `<CaptureForm>` + `/sms` page + cgos `awen/routers/sms.py` Twilio webhook) ALL import from here so the text never drifts across surfaces — carrier reviewers cross-check the consent screen against the public disclosure page against the welcome SMS they receive, and any mismatch bounces the campaign. Edits to the strings in `lib/consent.ts` require resubmission of every active A2P 10DLC + RCS campaign; don't change them casually. cgos's Python backend can't import TS, so it hand-maintains a MIRROR at `~/cgos/awen/legal/consent.py` — same function names, identical output. Edits must land in both files in the same PR. Dynamic args (`brandName`, `messageTypes`, `frequency`, `supportEmail`) interpolate per call; the carrier-locked frame (CTIA disclosures + ordering + punctuation) is in the function bodies. New workspace tiers needing distinct message-type defaults extend `DEFAULT_MESSAGE_TYPES_BY_KIND`. **Category-split consent (v0.36.0, the CTIA-compliant shape Twilio requires for RCS):** consent is split into **marketing vs non-marketing (transactional), per channel** — four short affirmative checkbox-label builders (`buildMarketingEmailConsentText`, `buildMarketingSmsConsentText`, `buildTransactionalSmsConsentText`, `buildTransactionalEmailConsentText`) say WHAT the fan is opting into, and ONE consolidated disclosure (`buildConsentFinePrint` + the JSX `renderConsentFinePrintNodes`) carries the carrier-required elements (consent-not-a-condition, rate/frequency disclosure, HELP/STOP) once below the form, ending in a single linked **Terms & Conditions**. Funnel→category map: follow / portal / feather splash → marketing email + marketing SMS; booking → transactional SMS. Transactional builders take an optional `topic` (defaults to `"my appointment"`). The legacy single-surface `buildSmsConsentText`/`buildEmailConsentText` are retained for the `/sms` info page until it migrates. The 4-dimension consent model these map to lives on `workspace_contacts.subscribes_{marketing,transactional}_{email,sms}` (cgos schema). **v0.38.0 (2026-06-08)** reworded `buildConsentFinePrint` per a Twilio carrier-review note: it now opens "By submitting your information, you agree to receive marketing and promotional messages from {brand}." and closes with the verbatim tail **Terms & Privacy.** — the Under-18 parental-permission line and the no-sharing clause were dropped, and `renderConsentFinePrintNodes` splits on "Terms & Privacy" to wrap **Terms** (→ `TERMS_URL`) and **Privacy** (→ `PRIVACY_URL`) as two separate links. (v0.37.0 was a same-day predecessor that ended in a single "Terms & Conditions" link; superseded before any deploy.) Lockstep edit landed in `~/cgos/awen/legal/consent.py` + the `tests/test_consent_mirror.py` snapshot. **Canonical reference + the authoritative cross-repo surface list: [`docs/consent.md`](docs/consent.md)** — keep it current when adding any surface that shows or records consent (e.g. the feather.fm `/<slug>` portal capture form added 2026-06-16).

## Single source of truth atom inventory

Tokens + base utility classes + v1 atoms. To add or change a token, edit `tokens.css`, push, then `npm install` in consumers (or `npm link cgos-ui` for live local iteration).

| Need | Import from | Notes |
|------|-------------|-------|
| Pill / filter chip / segmented toggle | `cgos-ui/ui/ControlChip` → `ChipToggle`, `ChipSelect`, `ChipMultiSelect`, `ChipGroup`+`ChipSegment` | 28px height, the only pill atom. Do not roll your own. `ChipSelect` for single-select (sort, lens, view); `ChipMultiSelect` for filters where 2+ values make sense (status, tag, channel). Multi auto-shows a search-within input when options > 8. **`ChipGroup` accepts `size`: `sm` (default, 28px filter-row) or `md` (40px form-body segmented control matching Input/Select md). Use `md` whenever the group sits in a form body alongside text inputs.** Size flows down to nested `ChipSegment`s via context — never set it on individual segments. |
| A named record in a row (tag, venue, client, lead, collaborator) | `cgos-ui/ui/EntityChip` | The chip that STANDS FOR A THING, as opposed to `ControlChip` which sets a value. Body opens the record, `onRemove` renders a × that unlinks it — so "remove, then pick again" is the edit, the way a tag row already works. `label={null}` renders `placeholder` in a dashed muted voice and drops the × (an unlinked venue is information, not an error) while staying clickable, because clicking is how you fill it. `tone`: `neutral` (default, glass — chrome, where the row already says what the field is) or `accent` (tinted + uppercase — the tag treatment, where the chip IS the content). Root is a span holding two SIBLING buttons; never nest the × inside the body. **Adopters:** cmngrdn staffing venue/client. **Still to adopt** (each is a hand-rolled copy of this): cmngrdn `InspectorTagsField` (inline-styled pill), `.cpv-tag-pill` on the contact profile, staffing `LeadLine`. |
| Text button (any action) | `cgos-ui/ui/Button` | Variants: `primary` (accent fill, **default**), `ghost` (surface fill + border), `accent` (accent-outlined), `danger` (red-tinted), `link` (bare accent text), `glass` (frosted-floating; opt into circular via `pill` boolean). Sizes: `xs` (24px) / `sm` (32px) / `md` (40px, default) / `lg` (48px hero CTA). Loading state, iconLeft/iconRight, fullWidth. HIG press depression. Pass `href` to render as `<a>`. |
| Icon-only button | `cgos-ui/ui/IconButton` | Variants: `ghost` (default), `subtle`, `accent`, `danger`. Sizes: `xs` (16px, skips hover-bg lift), `sm` (24px), `md` (32px, default), `lg` (40px). Always pass `label` for a11y. CSS pseudo-state hover, focus-visible ring, HIG press scale(0.95), `active` toggle (aria-pressed). Replaces every `<button style={{ all: 'unset' }}>` with an icon. |
| Toggle / switch | `cgos-ui/ui/Toggle` | Sizes: `md` (32×18, default) / `sm` (26×14). Tones: `accent` / `success` / `warning` / `danger`. Optional `label` renders as a clickable row. `role="switch"` + `aria-checked` baked in. |
| Status pill / badge / count label | `cgos-ui/ui/Badge` | Tones map to `--cg-status-*` tokens (8 tones). Variants: `subtle` (default), `outline`, `solid`. Sizes: `sm`/`md`. Optional `dot` + `uppercase`. Never inline a status color. |
| Centered modal / dialog / wizard | `cgos-ui/ui/Modal` | Portal-rendered, click-outside + Esc close. **Glass-frosted backdrop**; surface itself is opaque by design. Animates on **both** open and close — enter (`cg-modal-fade` + `cg-modal-rise`) and exit (`cg-modal-fade-out` + `cg-modal-rise-out`, keyframes in `base.css`) — via `usePresence`, which keeps the surface mounted for the 160ms exit before unmount (v0.41.0; previously hard-cut on close). Reduced-motion collapses both directions to instant. |
| Keep-mounted-through-exit hook | `cgos-ui/ui/usePresence` | `usePresence(open, exitMs=180) → boolean`. Bridges the hard-cut-on-close gap for any overlay: returns whether to render, staying `true` for `exitMs` after `open` flips false so an exit animation can play, then unmounts. Drive enter/exit keyframes off the caller's own `open` flag. Reduced-motion unmounts on the same tick. Consumed by `Modal`; reusable for menus / drawers / popovers. |
| Composing a message a human will receive (email reply, transmission body, SMS, social post) | `cgos-ui/ui/Composer` | The one text-entry engine. contentEditable + execCommand, carrying the details each of which was a bug once: toolbar buttons fire on `mousedown` with `preventDefault()` (a `click` collapses the selection first and the button appears dead), `exec()` focuses the editor before running, emptiness is `innerText.trim()` (iOS leaves a stray `<br>` so innerHTML lies), and the field is UNCONTROLLED — synced only when `value` diverges from the DOM, because writing innerHTML every render sends the caret to position zero. **Capability belongs to the CHANNEL, not the editor** — pass `channel="email"|"sms"|"rcs"|"social"` (or explicit `capabilities`). SMS is empty on purpose: SMS is GSM-7/UCS-2 plain text with no markup layer, so a bold button could only emit Unicode math-alphanumerics (𝗯𝗼𝗹𝗱), which flip the body to UCS-2 and halve the segment budget — measured 1 segment → 2 for the same 40 characters. `rcs` is populated and unused, so the day RCS carries formatting an SMS surface changes a string, not a component. **A capability-less channel hands back PLAIN TEXT, not `innerHTML`** (`isPlainTextSurface`) — a contentEditable inserts `<div>`/`<br>` on Enter whatever its toolbar offers, and SMS has no HTML layer to strip it, so the recipient would read the tags and the invisible characters could buy a second segment. Keyed on capabilities, NOT paste mode: the inquiry reply is `paste="plain"` but genuinely rich and must keep emitting markup. **`ref` exposes `ComposerHandle.insertText`** for toolbar-inserted content — the emoji picker is why `toolbarExtras` exists, and by the time its `onClick` fires the popover has taken the selection, so the engine remembers the last in-editor Range and restores it (without this every emoji lands at the end of the body). **`submitOn`** is `modEnter` (document: Enter breaks, ⌘+Enter sends) or `enter` (chat: Enter sends, Shift+Enter breaks) — a property of the SURFACE, not the transport, since an SMS thread and an SMS broadcast are both `channel="sms"` and want opposite things. `paste="rich"` keeps an allowlist (b/strong/i/em/u/a/ul/ol/li/br/p, `href` only on http(s)/mailto) so a Gmail paste keeps its bold and its links but drops Arial and hardcoded blue; `plain` (default) strips everything. A channel with no capabilities is FORCED to plain regardless of what it asks for — otherwise the operator sees formatting the send path will strip. `<script>`/`<style>`/`<iframe>` are dropped WITH their contents, never unwrapped (unwrapping put `alert(1)` in the body as visible text). Pure parts live in `ui/composer-core.ts` and are asserted by `npm run audit:composer` (24 assertions). `toolbarExtras` is the emoji-picker slot; `footer` is where the SMS encoding HUD goes. It does not send, own attachments, or know what a transmission is. |
| Transient status notification (toast) | `cgos-ui/ui/Toast` → `ToastProvider` + `useToast()` | The system's toast — mount ONE `<ToastProvider>` near the app root, then `const { toast } = useToast()` anywhere beneath: `toast({ title, description?, tone?, duration? })`. Tones `info`/`success`/`warning`/`danger` map to `--cg-status-*` (danger uses `role="alert"`, rest `role="status"`). Auto-dismisses after `duration` (default 4500ms; `0` = sticky). Glass-floating surface, tone-colored left spine + dot, ✕ dismiss. Portal to `document.body`, bottom-right (responsive width), `z-index: 1300` (above modals); container is pointer-events-transparent so toasts never block clicks in the gaps. Enter/exit via `cg-toast-in`/`cg-toast-out` keyframes in `base.css` + the per-item `leaving` state (same keep-mounted-through-exit pattern as Modal); reduced-motion collapses both to instant. **Use for every "saved / sent / copied / failed" moment** instead of a hand-rolled inline banner. **SSR rule (v0.46.3, and it applies to ANY atom that portals):** the portal is gated on a `mounted` flag set in an effect, never on `typeof document !== 'undefined'`. That check reads like an SSR guard and is the wrong one — it is false while the server renders and **true on the client's FIRST render, which is the render React reconciles against the server's HTML**, so the server sends no viewport, the hydrating client has one, and every SSR'd consumer throws "Hydration failed…" pointing at a `<div aria-live="polite">` nobody wrote. cmngrdn's `/hq` shell carried that as an unexplained intermittent error for weeks. A state flag is false for both the server render AND the hydrating render, so the two agree and the portal arrives on the next commit. |
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
| Loading — multi-line text block | `cgos-ui/ui/SkeletonText` | Preset over `Skeleton`: stacks `lines` (default 3) shimmer bars with a shortened last line (`lastLineWidth`, default 60%) so a loading paragraph reads as a paragraph silhouette, not a slab. Props: `lineHeight` (12), `gap` (8), `width`, `lastLineWidth`. Formalizes the "stack several with varied widths" hint into one preset so every loading paragraph matches. Pure presentational (no `'use client'`). |
| Loading — list-row silhouette | `cgos-ui/ui/ListRowSkeleton` | Preset shaped to the `UniversalListRow` contract (`3px 40px 1fr auto` grid, 12px gap, 64px height, `0 16px 0 0` padding): dim status spine + 40px thumb + name/sub-meta stack + optional right-anchored meta. Renders `rows` (default 6). Props: `thumb` (`square`/`circle`/`none`), `meta` (bool). Use as a list's loading state so it has the SAME silhouette as its loaded rows and nothing shifts on hydration — pair with the cmngrdn list module. Pure presentational (no `'use client'`). |
| Scroll-reveal (below-the-fold entrance) | `cgos-ui/ui/Reveal` | Dependency-free entrance animation (no framer): one `IntersectionObserver` per block + a CSS transition on the token motion scale (`--cg-duration-slow` / `--cg-ease-entry`), so lean public pages stay lean. Props: `index`/`step` (stagger — delay = `index * step`ms), `distance` (upward travel while hidden, default 14px), `className`/`style`. Three-way progressive enhancement: **no-JS** (consumers ship a one-line `<noscript>` guard forcing `.cg-reveal` visible — see below), **reduced-motion** (resolves visible-instant in JS + the `base.css` `.cg-reveal` floor), **otherwise** settles on viewport entry (observer fires once then disconnects; a 2.5s backstop timer means content can never stick at opacity 0). Only wrap content that begins BELOW the fold. Graduated from cmngrdn (exp-hardening Wave 0) so every front door shares one reveal grammar. **Consumer `<noscript>` guard** (root layout): `<noscript><style>.cg-reveal{opacity:1!important;transform:none!important}</style></noscript>`. |
| Expand/collapse section | `cgos-ui/ui/Collapsible` | Header (`trigger`, always visible, toggles on click) + smoothly-animated body via the `grid-template-rows: 0fr→1fr` technique (no JS height measurement). Controlled (`open`+`onOpenChange`) or uncontrolled (`defaultOpen`). `aria-expanded`/`aria-controls` baked in. Body wrapper carries `.cg-collapsible-content` so the reduced-motion guard drops the transition. Built for the Pulse "collapsed strip above the list → opens to the full chart" pattern. |
| Chart/panel error state | `cgos-ui/ui/ChartError` | Compact danger-tinted inline error (`message` + optional `onRetry` button) sized to a failed analytics panel's footprint, so one chart can fail without taking the page down. Self-contained (no CSS dependency — the Retry control is a minimal inline button). Sizes `sm`/`md`. Promotes the copy-pasted `ErrorState` from cmngrdn's analytics Bodies into one atom. |
| Single-metric stat tile | `cgos-ui/ui/StatTile` | Compact `value` (pre-formatted — atom does no number formatting) + `label` + optional `delta` (with explicit `tone` up/down/flat, because "up" isn't always good). `accent` colors the value; set `onClick` to make it a filter control (renders as `<button>`, `selected` adds the accent cross-filter ring). The unit cell of a Pulse summary row (Audience health strip). Generalizes cmngrdn's `OverviewBody` TileCard. |
| Linked-entity drilldown card | `cgos-ui/ui/LinkedEntityCard` | Inspector-Details drilldown atom — identity-strip card with `kind` eyebrow ("Contact" / "Appointment" / "Inquiry") + optional avatar (round person tile or square workspace sigil) + title + sub-meta + optional badge + "→" affordance. Use to navigate from one entity inspector to a related entity's canonical inspector. Same chrome treatment as the other drilldown cards. **Pure presentational** — caller resolves the related entity's identity strip + the click handler (typically `inspector.pushInspector({ ...canonical body... })`). Atom doesn't lookup kind→inspector mapping; that's the caller's concern. Built-in `loading?` + `empty?` states. |
| Module-tile icon chip (sidebar / launcher / module cards) | `cgos-ui/ui/ModuleIconChip` | Two visual variants via `variant` prop: `translucent` (default — Liquid Glass tinted; 24% module-color fill + backdrop blur + rim highlight) and `iridescent` (solid embossed iOS app-icon look; radial dome highlight + bottom shadow + accent glow). Always pass the module's accent hex or CSS var as `color`; the chip handles all tint math so all surfaces stay identical. Props: `size` (default 56px chip side), `iconScale` (default 0.54 — 30px icon on a 56px chip), optional `iconColor` override (defaults to module accent on `translucent`, white on `iridescent`). **Pure presentational** — no hover/focus/active states; parent `<button>` or `<a>` owns those. Use anywhere a module needs a tile icon: sidebar rows, mobile launcher tiles, search-result rows, module cards. Never tint a module icon manually — extend this atom. |
| Apple Wallet pass preview (art editor + member portal) | `cgos-ui/passes/PassCard` → `PassCard` + `PassCardInWallet` | Pixel-accurate Apple Wallet storeCard visual: header (logo + level chip) / strip banner / MEMBER name / WORLD + LEVEL row / PASS # / barcode tile. Props: `art: PassArt`, `workspaceName?`, `serial?`, `memberName?`, `level?`, `scale?` (1 = 320px native Apple width — scale down for thumbnails), `barcodeAltText?`, `showBarcode?`. `PassCardInWallet` wraps the card in the outer iOS chrome for the art-editor context. Barcode colors/placement/size are Apple-locked — the atom enforces the constraints so callers don't have to. **Single source of truth** — any pass visual change lands here; consumers never hand-roll a pass preview. |
| "Continue with Google" button | `@/components/auth/GoogleSignInButton` in **cmngrdn** (hoist candidate) | CANONICAL Google sign-in button across every auth surface. 4-color G logo + "Continue with Google" label. Variants: `surface` (legacy cgos dashboard look — muted bg + hairline border, secondary action) and `solid` (inverted, primary-CTA contexts). Standalone `<GoogleGlyph>` exported for non-button surfaces. Brand-identity hex literals (`#EA4335 / #4285F4 / #FBBC05 / #34A853`) locked by Google's identity guidelines. Mounted in cmngrdn on `/hq/sign-in`, `/join`, `<ReturningMemberPrompt>`, `<GardenPassCTA>`. Lives in cmngrdn today; visual atom is hoist-ready when a second consumer needs it. Never hand-roll a Google button anywhere — extend this. |
| "Add to Apple Wallet" button | `@/components/hq/vault/AddToWalletButton` in **cmngrdn** (data-aware wrapper) | CANONICAL Apple Wallet install CTA. Bundles cgos `GET /api/passes/download` fetch + auth header + blob→download + iOS Safari Wallet-sheet handoff + the full error-message ladder (401/403 → re-sign-in nudge, 503 → cert-config message). Aesthetic mirrors Apple's official "Add to Apple Wallet" badge: black surface, white Apple logo, two-line "ADD TO / Apple Wallet" label in SF Pro, identity-locked colors. Variants: `pill` (full badge) and `inline` (compact text-link). Mounted in cmngrdn on `<ArtPieceInspector>` Design tab, `<HeldPassesSection>`, `<GardenPassCTA>` signed-in state. The visual badge could split into a pure-presentation `AppleWalletBadge` atom here if a second consumer needs it; for now the visual contract is locked in this row. Never hand-roll an Apple Wallet button — extend this. |
| Tab (page header / inspector sub-tabs / any tab surface) | `@/components/hq/tabs/HqTab` in **cmngrdn** (hoist candidate) | CANONICAL single-tab primitive. Locked visual: tabbed-outline look (rounded top corners `var(--cg-radius-md)` + elevated bg `var(--cg-bg-elevated)` + 2px accent underline + 600 weight on active; transparent/muted on inactive). `margin-bottom: -1px` overlap trick makes the active underline TOUCH the chrome divider beneath — parent container MUST set `align-items: flex-end` for this to work. Link or button variants (set `href` for Next.js `<Link>` with prefetch + pending pulse). Used internally by cmngrdn's `<PageHeader>` (top-level page nav) AND `<SubTabs>` (inspector sub-tabs) so both surfaces share one vocabulary. **Hoist-ready** — pure presentational, no consumer-specific logic; lift to `cgos-ui/ui/HqTab` when cgos dashboard's tab surface needs the same primitive. See cmngrdn CLAUDE.md → "Unified Chrome System" + "Inspector Contract → Tab discipline". |
| Inspector chrome system (drawer + header + preview/edit composer) | `@/components/hq/inspector/*` in **cmngrdn** (context-bundled, stays put) | CANONICAL `/hq/*` inspector chrome — drawer/sheet shell + slot routing + preview/editor split + framing. Bundles `InspectorContext` state + `useOptimisticSave` integration + auto-derived View public / Copy link actions (from `preview.previewUrl`). Three frame policies — `page` (default; phone frame on desktop, edge-to-edge on mobile, mobile/desktop toggle), `artifact` (centered card preview for passes / collectibles), `desktop-only` (admin tooling). Two routing patterns — Pattern A (simple `preview` + `editContent` slots) and Pattern B (tabbed body owns slots per-tab). **Typed `actions: InspectorAction[]` slot renders as icon-only chips via `<IconButton>` + the chip treatment (`border: 1px solid var(--cg-border)` + `background: var(--cg-bg-surface)` + `border-radius: var(--cg-radius-sm)`). All four header controls (back / actions / expand / close) share ONE 28px chip so the header cluster reads as one family — the 28px header-CHROME tier, while in-body + list-row chips stay 24px (the in-CONTENT tier). Labels become `aria-label` + hover `title` only, never visible. `placement: 'overflow'` actions always fold into a ⋯ dropdown (no width-based reflow); dropdown items DO render icon + label.** Optional `summary` / `titleBadge` / `footer` slots layer additively on the base chrome (see § Inspector Contract → Optional chrome slots). Held in cmngrdn because the chrome bundles cmngrdn-specific context + cgos SDK calls; visual contract is locked here regardless. See cmngrdn CLAUDE.md → "Inspector Contract → Header action vocabulary" for the complete spec + the 7-point checklist for adding new chrome surfaces. |
| Inspector body states (loading / empty / error) | `@/components/hq/inspector/InspectorBodyState` in **cmngrdn** (hoist candidate) | CANONICAL centered body-state primitives — `<InspectorBodyLoading label?>` (spinner + label), `<InspectorBodyEmpty title hint? icon? action?>` (icon + heading + hint + CTA, mirrors `<EmptyState>` rhythm), `<InspectorBodyError message onRetry?>` (red-tint badge + message + retry button). Drop-in replacements for every centered "Loading…" span across inspector bodies. **Hoist-ready** — pure presentational; could move to `cgos-ui/ui/InspectorBodyState` if cgos dashboard wants the same vocabulary. |
| Preview frames (mobile + desktop) | `cgos-ui/preview/MobileFrame` + `cgos-ui/preview/DesktopFrame` (raw atoms) **PLUS** `@/components/hq/preview/*` in **cmngrdn** (scaled + frame-policy-aware wrappers) | Raw `MobileFrame` (393×852 iPhone shell with status bar + Dynamic Island + Safari pill) + `DesktopFrame` (1280×800 page surface, no chrome — Vite dashboard legacy, mostly unused on cmngrdn). cmngrdn wraps them in `<ScaledMobileFrame>` + `<ScaledDesktopFrame>` (uniform-scale via shared `useScaleToFit` ResizeObserver) + `<InspectorPreviewPane>` (frame-policy router). **In cmngrdn, raw frame imports are ESLint-banned outside `src/components/hq/preview/`** — every consumer goes through `<InspectorContent>` so framing rules + viewport toggle + mobile-screen edge-to-edge treatment stay locked in. Mirror this guard in any new consumer that mounts the raw atoms. |
| List row + grid tile (every `/hq/*` list surface) | `@/components/hq/list/*` in **cmngrdn** (hoist candidate) — `<UniversalListRow>` + `<UniversalTile>` | CANONICAL list-row primitive for every `/hq/*` module list. Locks the 3-zone grammar (3px status spine left edge, 40px thumb + name + sub-meta body, right-anchored progress/time/none + up to 2 disabled-when-N/A action buttons), the row-height contract (64px desktop / 72px mobile), and the no-chips-in-rows hard rule. Tile sibling locks the top-spine + thumb + name + bottom-slot grid skeleton. Thumb supports image / Phosphor icon / typographic mark / color swatch. Right anchor variants — `progress` (Library, Missions, Transmissions-draft, Offerings), `time` (Appointments, SMS, Activity, Chat, Admin Tasks, Transmissions-sent), `none` (Audience, Tags, Members). Status spine maps to existing `--cg-status-*` tokens via a per-module `statusToSpine()` helper in `src/lib/card-adapters/spine.ts`. Mobile collapses both action slots (consumers handle overflow via `usePageAction` drawer or rely on tap-to-inspect). **Hoist-ready** — pure presentational, no auth/fetch; lift to `cgos-ui/ui/UniversalListRow` + `cgos-ui/ui/UniversalTile` once cgos dashboard adopts the same primitive (or once the cmngrdn sweep across all modules is complete). See **[`docs/list-row-template.md`](docs/list-row-template.md)** for the full contract: 3-zone grammar, variant rules, per-module field-mapping matrix, hard rules. Never roll a custom row CSS skeleton inside a module — per-module variation lives in props (sub-meta content, thumb kind, status token), not in module CSS. |
| Social brand glyph (monochrome) | `cgos-ui/ui/SocialBrandIcon` | Monochrome brand glyph for the 9 canonical CG social platforms (`instagram` / `spotify` / `youtube` / `apple_music` / `soundcloud` / `bandcamp` / `tiktok` / `x` / `discord`). Single 24×24 `<path fill="currentColor">` so it inherits the parent's `color` + tints on hover via CSS — no per-platform brand color baked in, stays theme-aware across light + dark. Pure presentational, NO `'use client'` (renders in server components — e.g. the public portal social row). Props: `platform` (`SocialBrandKey | (string & {})` — autocompletes the 9 keys, accepts a looser `string` without a cast; unknown keys render `null`), `size` (default 19), optional `className` + `style`. **Atom owns ONLY the glyph paths** — the canonical key set + render order live in the CONSUMER (cmngrdn `@/lib/social-links` → `SOCIAL_PLATFORM_KEYS` / `SOCIAL_PLATFORMS`); don't re-derive ordering here. Consumed by cmngrdn `<PortalSocialRow>` + the portal editor's social-module summary. **Distinct from cmngrdn's smart-links `PlatformIcon`** (`portal/Links.tsx`) — that one is a different contract (per-brand `color` fills, not `currentColor`; covers extra streaming platforms amazon_music/tidal/deezer + a letter fallback for arbitrary `platform: string`), so the two deliberately stay separate; the 5 shared music glyph paths are duplicated by design. |
| Tag chip editor (a set of tags on a record) | `cgos-ui/ui/TagListField` | The chip list for "who does this person become when they come through here". Props: `tags` (string[]), `onChange` (full next list — the caller owns persistence), **`normalize` (REQUIRED)**, `disabled`, `placeholder`, `ariaLabel`. **Normalization is the CALLER's contract, deliberately.** Tag slug-normalization is a platform rule with a Postgres implementation (`normalize_tags_array`) and per-app mirrors (cmngrdn `@/lib/tag-normalize`, cgos `awen/tags.py`); an atom shipping its own regex would become a fourth definition and drift from the trigger that decides what actually gets stored. Passing it is what makes the duplicate check real rather than a case-sensitive near-miss. Return `''` to reject. **Enter AND comma commit, and blur commits the remainder** — production evidence is that a trailing `', '` is how somebody reaches for a second tag, so the separator they already use must work rather than silently becoming part of the tag. Backspace on an empty field removes the last chip. FILL tier (translucent, hairline, no blur/shadow) because it lives inside a card; chips are pill tier. **Why it is here:** cmngrdn had two implementations of one idea — a chip list on inquiry forms and a single text input on portal pages, the latter buried three levels deep, where somebody typed `'wafeo, '` into a field that holds one tag. Schema unified in cgos `20260819143802`; the control followed. Tagging is not a Library or Service concept — audience, crew, collectibles and quests all reach for the same shape. |
| Resizable · reorderable · persisted table columns | `CatalogList.tsx` in **cmngrdn** (hoist candidate) | Pattern for dense multi-column `/hq/*` operator tables (the "spine-only" surfaces that keep a bespoke grid body instead of `<UniversalListRow>`). One shared grid template (`--{mod}-grid`, injected inline) drives header + every row; exactly ONE `FLEX_COL` is `minmax(w,1fr)` and absorbs slack so trailing chrome stays right-pinned. **Locked interaction (2026-07-08):** ONE resize grip per column, on its LEFT edge (the divider left of the label, resizing THAT column — drag left widens); NEVER a second grip on the right edge (two-per-boundary was explicitly rejected as non-standard). Reorder via HTML5 drag on the header cell; widths+order persist to `localStorage['cg-hq-{mod}-cols']`. Gotchas: right-aligned (`end`) columns right-align the LABEL only (`margin-left:auto`), never `justify-self:end` on the cell (grip would drift off the boundary); hydrate once via mount effect (lazy `useState` init + `useSyncExternalStore` both fail); resize uses local hoisted `move`/`cleanup` fns + CSS `col-resize` cursor to satisfy React Compiler. **Hoist target:** a generic `useResizableColumns` hook + `<ColumnResizeGrip>` primitive → `cgos-ui`, when the second dense table (Audience/Inquiries) adopts it. Full contract: cmngrdn **[`docs/hq-table-columns.md`](https://github.com/cmngrdn/cmngrdn/blob/main/docs/hq-table-columns.md)** + cmngrdn CLAUDE.md → Conventions. |
| Machine-written prose about a record | `@/components/hq/awen/AwenNote.tsx` in **cmngrdn** (hoist candidate) — `<AwenNote>` | CANONICAL treatment for a passage **Awen wrote ABOUT a record**, rendered inside that record's inspector. **The rule it holds: generated prose must be attributable at a glance** — not because it is less trustworthy, but because an operator reading back their own case notes needs to know which sentences they are accountable for. An inquiry body already carries two voices (the client's own answers, the operator's private notes); a machine-written third that could be mistaken for something the artist typed is worse than no note. Renders FIRST in a body, ABOVE the relation strip that body-grammar rule 1 otherwise reserves — a recap is a synopsis of the record, closer to the glance band than to body content, and only prose length keeps it out of the band. **FILL tier, never a card** (the rail is the card): fill ground, a leading rule in the accent, a `Sparkle` glyph — no blur, shadow or elevation claiming to be a separate surface. Props: `label` (defaults to "Awen's recap"), `children`, optional `actions` slot for a regenerate/timestamp control. **Naming is deliberate**: it replaced three names for one thing — DB column `awen_greeting`, inspector label "Awen's Greeting", settings toggle "Assistant writes a recap" — and picked the word that was already user-visible. "Greeting" was wrong for a passage addressed to the artist summarising somebody else's message. **Hoist-ready** — pure presentational, no auth/fetch; lift when a second surface (contact, transmission) or a second repo needs it. |
| Date / time / datetime input | `@/components/hq/fields/` in **cmngrdn** (hoist candidate) — `DateField` · `TimeField` · `DateTimeField` | CANONICAL date-entry primitives. **Native `<input type="date"|"time"|"datetime-local">` is banned platform-wide** — it fires `onChange` on every partial keystroke and emits `""` for an incomplete date, so on ANY autosaving surface (the platform default) typing a date clears the stored value, saves the clear, receives it back as props, and resets the field under the cursor. That is the "glitchy date picker" bug class; it is commit-timing, not styling, and no amount of restyling fixes it. `DateField` = calendar dropdown (portaled to `<body>` like `LibrarySelectMenu` so an `overflow:hidden` accordion/inspector can't clip it; closes on scroll/resize; the caption opens a year+month jump grid — load-bearing for birthdates). `TimeField` = listbox of fixed increments (`step` minutes, default 15), scrolled to selection on open. `DateTimeField` composes both on the `YYYY-MM-DDTHH:mm` contract. All emit **exactly once per selection, always a complete value or `""`**. Value contracts are identical to the native inputs they replace, so they're drop-in. Trigger metrics match `Input`/`Select` (32px sm / 40px md, same radius/border/focus ring) so a date field reads as one family with its form siblings; 40px + no text input on mobile, so no iOS auto-zoom concern. Surfaces wanting a different look restyle `.cg-datefield-trigger` (cmngrdn `.stf-inline-date` in `staffing.css` is the prose-style inline treatment) rather than reverting to a native input. **Hoist-ready** — pure presentational, no auth/fetch; lift to `cgos-ui/ui/DateField` when a second repo (feather / reliquary) needs a date input, rather than forking a third copy. See cmngrdn CLAUDE.md → Design System. |
| Unified single + multi select (portal-anchored) | `LibrarySelectMenu` in **cmngrdn** `AssetMetadataEditor.tsx` (hoist candidate) | ONE dropdown for BOTH single- and multi-select — identical trigger + portal-anchored menu; multi shows checkboxes (stays open), single shows radio dots + a "None" row (closes on pick). Portaled to `<body>` so an `overflow:hidden` accordion can't clip it. Replaces the native `Select` inside the library editor so Type (multi `Asset Types`/`Project Type`) + Status (single) read as ONE control. **Hoist target:** the platform-wide unified select atom cgos-ui has wanted (today only the native single-select `Select` exists; no multi). Lift to `cgos-ui/ui/` when a second surface needs multi-select; until then the contract is locked in this row. Don't reach for native `Select` on a surface that also has a multi-select dropdown — use this so they match. |
| File-drop plumbing (drag-and-drop onto any upload surface) | `useFileDrop` in **cmngrdn** `src/components/hq/upload/` (hoist candidate) | **Deliberately a hook, not an atom.** There is no shared ImageUpload component and there shouldn't be one yet — the upload surfaces across the system genuinely differ in what they do with the file (resize target, bucket, what gets written). What they all identically LACKED was drop, because that part is pure event plumbing nobody wants to write six times. So the hook shares the plumbing and each surface keeps its own upload path: spread `handlers` onto the drop target, read `dragging` for the hover style. Holds the three non-obvious bits — `dragover` AND `dragenter` must both `preventDefault()` (miss either and the browser navigates the tab to the file, **discarding unsaved edits**); `dragleave` fires when the cursor crosses onto a CHILD, so it counts depth rather than flipping a boolean; a dropped folder arrives with empty `type`, so the `accept` prefix is what rejects it. **Visual contract:** an accent dashed outline on the drop region, plus an overlay cue on tiles that already hold an image (a hover state on a photo says nothing). **Hoist trigger:** a second repo needing drop. Adopted so far only by cmngrdn `AssetArtworkSection`. |
| Entity detail card (inspector header ↔ list Cards-view row) | `LifecycleSummary` + `.lib-lifecycle-*` / `.lib-phase-bar*` in **cmngrdn** (hoist candidate) | The "one card, two shells" pattern — the SAME entity glance (artists / count / status · % + a phase-completeness bar) is meant to read as an inspector `summary`-slot header AND (target) a list Cards-view row. The genuinely-shared piece is the completeness / phase-bar **viz**; the shells differ (a row has thumb + nesting chevron + click-target; the header has controls). **Hoist target:** a `cgos-ui` phase-bar / completeness-viz atom wrapped by two shells, spec'd in a future `cgos-ui/docs/detail-card.md` when the Cards-view consumer lands. Until then `LifecycleSummary` is the single implementation (pure-props, context-free) + this row captures the intent. Pairs with the `summary` chrome slot (see § Inspector Contract → Optional chrome slots). |

## Token surface

Tokens live in `tokens.css` under `:root` (dark default) + `:root[data-theme="light"]` (light overrides).

- **Color:** `--cg-bg`, `--cg-bg-elevated`, `--cg-bg-surface`, `--cg-text`, `--cg-text-secondary`, `--cg-text-dim`, `--cg-text-muted`, `--cg-border`, `--cg-border-hover`, `--cg-border-subtle`, `--cg-accent`, `--cg-accent-dim`, `--cg-accent-glow`, `--cg-accent-subtle`, `--cg-backdrop`.
- **Status palette:** `--cg-status-success / warning / danger / blue / purple / neutral / archived / green / red / amber / cyan / magenta`. Consumed via `types/status.ts` maps in consumer repos.
- **Data-viz palette (Pulse charts):** `--cg-data-1..6` (categorical series colors — blue/orange/emerald/violet/magenta/gold, colorblind-aware), `--cg-data-reachable / -reachable-sms / -both / -unreachable` (fixed semantics for the audience opt-in ladder), `--cg-data-grid` + `--cg-data-track` (chart chrome). Re-pointed deeper in the light block so fills clear the ~3:1 non-text contrast floor on cream. Charts are ALSO themed per-module via an `accent` prop — these are the palette *independent* of module color. Spec: `cmngrdn/docs/pulse-analytics-design.md`.
- **Glass system:** `--cg-glass-bg`, `--cg-glass-bg-strong`, `--cg-glass-blur`, `--cg-glass-blur-strong`, `--cg-glass-border-top` (rim highlight, `var(--cg-text) 38%`), `--cg-glass-border-strong`, `--cg-glass-radius-sm/md/lg/pill`.
- **Fills:** `--cg-fill` / `--cg-fill-hover` / `--cg-fill-strong` — the tier BELOW glass (Apple's systemFill). A block that sits *inside* a surface: a row in a widget, a cell in a panel, a tile in a grid. Translucent by construction so the parent's glass still reads through, derived from `--cg-text` so they invert for free in light workspaces. **A fill is not a card — no border, no blur, no shadow.** See the surface-tier rule below.
- **Elevation:** `--cg-elev-0` through `--cg-elev-5` — five-tier shadow scale.
- **Typography classes:** `.cg-text-hero/display/title/body/small/label/label-sm/micro/mono/caption/callout`. Prefer these over inline `fontSize`/`fontWeight`.
- **Motion scale:** durations `--cg-duration-fast/base/slow/slower` (150/220/400/600ms) + easings `--cg-ease-entry` (decelerate, *appearing* surfaces), `--cg-ease-exit` (accelerate, *dismissing* surfaces), `--cg-ease` (bidirectional state changes), `--cg-ease-emphasize` (rare HIG featured motion). **JS-readable mirror: `cgos-ui/lib/motion`** — `duration`/`durationCss` (ms number + CSS string), `ease`/`easeCss` (cubic-bezier `[x1,y1,x2,y2]` tuple for framer + CSS string), `spring` (framer `transition` presets: gentle/bouncy/snappy), and a `cssTransition(props, {d,e,delayMs})` shorthand builder. Consume from here in any framer/rAF/`element.animate()` path so JS motion never drifts from the CSS tokens. Reduced-motion is a per-surface decision — gate at the callsite (CSS atoms do it in `base.css`).
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
- **No hand-rolled glass.** If you are writing `background: color-mix(... --cg-bg-elevated ...)` next to a `backdrop-filter` and a hairline border, you are rebuilding `<GlassSurface>` — use it. This is not hypothetical: cmngrdn shipped for months with `<BloomIndex>` reproducing the `frosted` recipe line for line, `/studios` reproducing `clear` + `tinted`, and the Home widget chassis landing on flat `--cg-bg-surface`, while the atom itself had **zero consumers in the repo**. Sitting side by side in one grid they read as three different systems, because they were.
- **No card inside a card.** A surface contains fills, pills, chips and rows — never a second bordered/blurred/elevated surface. Using the *correct* atom in the wrong place still counts: `cg-card-interactive` nested inside a glass widget is the same mistake as hand-rolling one.

## Surface tiers — glass, fill, pill

Three tiers, and depth is spent once. Reaching for a lower tier than you think you need is almost always right.

| Tier | What it is | Recipe | Where |
|---|---|---|---|
| **Glass** | The card. The thing that reads as lifted off the page. | `<GlassSurface>` — bg + blur + hairline + rim + elevation | Widgets, panels, popovers, drawers, sheets, top-level tiles |
| **Fill** | A block inside a card. | `--cg-fill` / `-hover` / `-strong`. No border, no blur, no shadow. | Rows, cells, grid tiles, stat blocks inside a widget |
| **Pill** | A label or small control. | Small radius + hairline + tint; may carry a border | Tags, chips, badges, counts, kbd, segment buttons |

**The widget contract.** A widget is ONE surface with many things inside it and its own controls — the iOS-widget model, and what `/studios` tiles, `<BloomIndex>` and the transmission audience picker all already do correctly. Two rules follow:

1. **One surface.** Everything inside is fill / pill / row. Nesting glass in glass makes both compete for the same "I am lifted" signal and neither wins — it reads as mush, which is exactly the note that produced this section.
2. **Sized, not grown.** A widget occupies its slot; more content scrolls or pages *inside* it. A "Show all N" that expands the widget and pushes its neighbours down is document behaviour, not widget behaviour — route it to a focused pullout instead. Give the widget its own header controls (filter / period / lens) rather than letting it get taller.

**THE RAIL IS THE CARD — so nothing inside an inspector body may be one (2026-08-15).** The same rule as the widget contract, applied to the surface it is easiest to forget about: an inspector is already glass, so everything in its body is fill or pill. Two atoms break this today and both should be fixed HERE rather than overridden per-consumer:

- **`<PulseSummaryCard>` composes `.cg-card-interactive`** — and by its own docblock it "lives inside an entity inspector's Details tab", i.e. its only home is the one place the tier forbids. Measured in cmngrdn's Dispatch rail: radius 16, an opaque `#181824` at 70%, a 1px border. That made it the loudest object in a body whose sections had just been flattened to bands, and it shipped that way on all TEN of its consumers. **`<JourneySummaryCard>` has the same chrome** and therefore the same defect, unmeasured only because it has fewer consumers.
- **The fix keeps the hover lift and the focus ring.** Those say "this is a door", which is true and is the card's only load-bearing behaviour. What goes is the claim to be a separate SURFACE: fill background, transparent border, radius down to 8, no shadow, no blur.
- **Interim state:** cmngrdn demotes both from `inspector-body.css` behind `NEXT_PUBLIC_HQ_INSPECTOR_BODY`, because that layer is flag-gated and reversible while the atom is shared with surfaces that have not adopted the standard. When every consumer is on it, move the recipe into the atoms and delete the override. **Do not add more class names to that override list** — a private module class that is secretly a card should be fixed at its own definition instead (cmngrdn's `.aud-card` is the worked example).

**The corollary for atom authors: an atom whose only home is inside another surface must be built for that surface.** If you find yourself writing a card because the component feels important, check where it actually renders first.

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
│ [‹]  Title [badge]          [Actions]   [⛶]   [×]        │  header
├──────────────────────────────────────────────────────────┤
│ summary band (optional) — persists across every tab       │  summary
├──────────────────────────────────────────────────────────┤
│ [Details]  [Content]  [Preview]  [Settings]               │  tabs (≤4)
├──────────────────────────────────────────────────────────┤
│           body — whatever the active tab renders          │
├──────────────────────────────────────────────────────────┤
│ footer (optional) — persistent commit actions / next-up   │  footer
└──────────────────────────────────────────────────────────┘
```

- **`‹` back button** — visible when `canGoBack === true`. Pops the history stack.
- **Title + Eyebrow** — entity name. Optional **`titleBadge`** slot renders an inline glyph / icon run next to the title (entity-type icon + live status/streaming icons) — set at open or via `setTitleBadge`.
- **Actions slot** — typed `InspectorAction[]`. Auto-derived View public / Copy link when `preview.previewUrl` is set. Renders as icon-only chips via `<IconButton>` + the chip treatment (`border: 1px solid var(--cg-border)` + `background: var(--cg-bg-surface)` + `border-radius: var(--cg-radius-sm)`). Labels become `aria-label` + hover `title`, never visible. `placement: 'overflow'` always folds into a ⋯ menu (no width-based reflow). Dropdown items DO render icon + label.
- **`⛶` Expand** — universal size control. Drawer (~480px) ↔ fullscreen takeover. **Decoupled from edit mode** — expand is its own affordance, NEVER auto-fires on edit.
- **`×` close** — clears inspector + entire stack.
- **The four header controls (`‹` back · Actions · `⛶` · `×`) are ONE 28px chip** — same size, border (`--cg-border`), surface (`--cg-bg-surface`), radius (`--cg-radius-sm`), subtle hover — so the header cluster reads as one family (no 24/28/44 mismatch). **Two intentional tiers:** 28px for this header-CHROME cluster (always-present, touch-comfortable); **24px** for in-body + list-row action chips (the denser in-CONTENT tier). Uniform within each tier; never mix sizes inside the header cluster. *(2026-07-16: header controls standardized to 28px — this supersedes the earlier "inspector actions match library-row chips at 24px" note. The two surfaces are never seen side-by-side; the parity that matters is within-cluster.)*
- **Tab strip** — composes `<HqTab>` (in cmngrdn at `@/components/hq/tabs/HqTab`; hoist candidate). Max 4 tabs per surface; horizontal scroll on mobile if overflow.

### Optional chrome slots — summary · titleBadge · footer

Three additive, optional slots on `InspectorContext`. All default null, so every inspector that doesn't set them is unaffected — they never change the base chrome.

- **`summary`** (`setSummary` / `openInspector({ summary })`) — a persistent band rendered BETWEEN the header and the tab strip. It rides the chrome, not the body, so it **persists across every tab**. When a summary is present, the header collapses to auto-height (`.hq-inspector-header:has(+ .hq-inspector-summary)`) so header + summary read as ONE detail card — not a rigid 48px chrome bar with a band bolted under it. Use it for an entity glance / detail-card header: the name lives in the chrome title, the band carries meta + status + a progress viz. cmngrdn reference: the library catalog inspector's `<LifecycleSummary>` (artists / `N assets` / status · % / four-phase completeness bar).
- **`titleBadge`** (`setTitleBadge`) — inline glyph/icon run next to the title (see the Title bullet). Entity-type icon + live status/streaming icons; kept live via `setTitleBadge` on edit.
- **`footer`** (`setFooter`) — a persistent band below the body for commit actions (Send / Publish / Save) + a "next up" hint. **Ownership rule: the footer is owned by the body that holds the state it acts on** (the editor with the dirty/save state), NOT the outer inspector-body wrapper — otherwise two components race over `setFooter`. It rides that body's mount, so it's present only on the tab where that body is mounted. References: the transmission builder's send bar; the library editor's save + next-up footer.

**A slot control that drives a tab BODY needs more than an event.** Slots persist across every tab; a tab body only mounts on its own tab. So a control in a slot that targets the body — cmngrdn's catalog phase bar, which lives in `summary` and jumps the Details editor to a phase — has a mount asymmetry: clicked from another tab, the listener doesn't exist yet, and switching tabs doesn't help because the event fires a render before the body mounts. The shape that works: **dispatch AND park** the request, the mounted body handles it live, an unmounted one drains the park on mount, whichever gets there first clears it so it can't run twice — and **time-box the park**, or a request nobody claimed (tab switch cancelled, inspector closed) fires on the next unrelated record the operator opens. Reference: cmngrdn `src/components/hq/library/lifecycle-jump.ts`.

### Routing patterns (Pattern A / Pattern B)

Two patterns; chrome supports both transparently. New inspectors pick one.

**Pattern A — canonical preview + edit composition.** Chrome auto-composes when you pass `preview` + `editContent`. View mode renders `viewContent ?? preview` framed; edit mode renders preview-left + editor-right via `<PreviewEditorSplit>`. Most surfaces use this (portal pages, transmissions, inquiry forms, collectibles).

**Pattern B — tabbed body with per-tab routing.** Pass `content` (the tabbed body) + `canEdit`; DO NOT pass `editContent`. Body reads `activeTabId` + `mode` from `useInspector()` and renders per-tab view/edit content internally. Each tab may mount its own `<InspectorContent>` if it wants the preview/edit split. Used by surfaces with multiple top-level sub-concerns where each may have its own editor — e.g. Vault Passes `<ArtPieceInspector>` (Design / Eras / Tiers / Notifications / Analytics).

### Body composition (content-only)

A tab body renders the entity's **CONTENT** — never a page surface. The chrome owns the title bar, framing, and tabs; the body owns what sits below them.

- **No page header / self-title.** The chrome's title IS the title. A body that renders its own `<header><h1>` (or eyebrow + title + subtitle block) echoing the chrome title is a violation. Section sub-labels inside the body are fine; a page-level title is not.
- **No page-width / centered container.** No `maxWidth` + `margin: auto`, no large page padding. The body fills the inspector and uses inspector-scale padding.
- **Use a canonical tab role** from the table below — do NOT re-list them here. This line held a second copy for months and drifted: it named `editor` and `activity` and `thread` (two retired, one superseded) while omitting `content`, `timeline`, `notifications` and `email`. One list, one place.
- **Never drop a full-page route component into a tab.** A `/hq/...` page surface carries its own header + max-width container + page padding; mounting it verbatim "sticks a page in a box." Factor the chrome out (or gate it behind an in-inspector flag/context) so the body is content-only before mounting.

This applies to ANY surface opened in the inspector — preview-bearing or not, present or future. The same discipline that keeps framing in one place (above) keeps titling + chrome there too. (cmngrdn 2026-06-03: the Activity pullout's `<ActivityBody>` was de-chromed to a content-only `activity`-role body; Pulse-card pullouts render their chart chromeless via a `PulseDetailContext` so the chart's own panel title doesn't echo the chrome title — see cmngrdn CLAUDE.md § Inspector Contract for the implementation.)

### Preview slot + framePolicy

The `preview` slot at `openInspector()` time declares an explicit framePolicy. Chrome owns the framing — bodies NEVER wrap previews themselves.

- **`page`** (default) — visitor-facing page preview. Desktop screen + mobile viewport = iPhone frame; desktop viewport = 1280×800 (or 1440×900 when `desktopNaturalWidth: 1440`). Mobile screen = edge-to-edge in the bottom sheet (device IS the frame). Mobile/desktop viewport toggle visible on desktop only. Used by portal pages, transmissions, inquiry forms.
- **`artifact`** — identity / card preview without a device context. Centered on a neutral surface, no chrome, no toggle. Same treatment on every screen. Used by Vault Collectibles.
- **`desktop-only`** — surfaces that only make sense at desktop width (admin tooling, full-bleed dashboards). Always renders in desktop frame. No toggle. Reserved.
- **`mobile-only`** — surfaces whose audience consumes them on a phone (Apple Wallet passes, iOS push notifications, future SMS conversations). Always renders in iPhone frame on desktop; edge-to-edge on mobile screens. No toggle. Used by Vault Passes.

### Tab discipline

**≤4 tabs per surface. Always seeking to simplify, lessen, or merge.** The cap is
the goal, not a budget to spend — a fifth tab is a signal that two of the first
four are the same idea wearing different labels.

**Different entities need different compartments, so the SET is fixed and the
SELECTION is per-entity.** A portal page's four and a contact's four have no
obligation to match; what they must not do is invent a role outside this table.

**DON'T BUILD THE COMPARTMENT UNTIL IT HAS SOMETHING IN IT — and settle that by
COUNTING (2026-08-16).** Asked whether the tag inspector wanted `details` +
`linked`, the answer came from production row counts, not taste: `unlock_rules`
**0**, `workspace_segments` **0**, `intake_forms.auto_tags` **1** across the whole
workspace. So a `details` tab there is a name, a count and three empty dependency
lists — and **a tag ships with ONE tab**, `linked`, because a tag IS its members.

This is the same defect as a tab labelled with a `· soon` suffix, or a
placeholder tab describing a future version of the thing beside it: *an empty
room with a sign on the door reads as broken, where its absence reads as
nothing.* It recurs — the same surface had a placeholder `linked` tab pulled
once already before it grew a speculative `details`.

**The useful half is what to do with the rare-but-real case.** The one dependency
that DID exist moved into the chrome, where it changes a decision: the tag's
glance band reads *"Auto-applied by {form} — deleting won't stop it coming
back"*, and the delete confirm repeats it. **A one-tab surface is a correct
outcome, not a failure to fill the cap** — and it drops the tab strip entirely,
which is what lets the roster have the whole panel.

`TabRole` is the enforced union in cmngrdn `src/contexts/InspectorContext.tsx`.
**This table and that union are one thing — change both in the same commit, and
keep the file's docblock listing exactly what the union holds.** They drifted
apart once (see the drift note below) and the cost was a doc naming two roles
that would not compile while hiding six that would.

| Role | The record's… | The test | Notes |
|---|---|---|---|
| `details` | identity — what it IS | Always. The landing tab. | Universal (89 uses). Analytics lives here as a `<PulseSummaryCard>` drilldown, never as its own tab. |
| `content` | material — what it's MADE OF | The stuff is substantial enough to be its own place (portal modules, room tracks, crew documents) rather than a field. | |
| `preview` | outward face — what a visitor or recipient sees | There is a real external render. | Routes through `useInspector().preview` + `<InspectorContent>`. |
| `timeline` | history — what has HAPPENED to it, and what was SAID | Anything chronological. Events and messages interleave in one stream. | **Replaces `thread` + `activity`.** See the merge note. |
| `linked` | roster — other records it relates to, **count varying** | Apply the anchor-vs-roster test (`cmngrdn/docs/inspector-archetypes.md`): does the count vary per record? If it's a fixed 1–3, it is an ANCHOR and belongs in the body's relation strip, not in a tab. | |
| `variants` | alternates — other versions of ITSELF | Same entity, different edition (pass eras, tiers). Not other entities — that's `linked`. | Single-use today (Vault Passes); merge candidate with `content`. |
| `email` | two-way correspondence BY EMAIL, with the composer in it | The entity carries a real mail thread you reply to in place. **Not a synonym for `timeline`.** | Added 2026-08-16 when cmngrdn's inquiry `thread` was renamed. See the split note below. |
| `settings` | configuration that isn't the editor | Knobs a visitor never sees and the editor doesn't own. | Under review — the platform direction is Settings as a header gear, which returns a slot to every surface at once. |
| `notifications` | outbound — what this record SENDS, and when | The entity fires messages of its own, and they have bodies you author. Not "it has a notify toggle". | Resolved 2026-08-16 (see below). One declarer today (services); passes are the case that should join it. |

**Retired vocabulary.** `editor` — Pattern A's edit-mode chrome IS the editor, so
the role never existed in the union and no surface declared one. `analytics` —
never declared, and no tab anywhere is even *labelled* Analytics; after-the-fact
data ships as the `<PulseSummaryCard>` drilldown inside `details`. Both appeared
in this section before 2026-08-15 and neither was real.

#### `email` vs `timeline` — why the merge stops at the inbox (2026-08-16)

`timeline` exists because a relationship is ONE sequence, and cmngrdn's contact
proved it by making the CONVERSATION the substrate and drawing events into it.
That works because SMS is HTML *we* author, so an event card and a message
bubble are the same material.

**Inbound Gmail is not.** It is a foreign document — inline font sizes, table
widths, its own background colours, authored at 600px — so interleaving small
event cards between full-width foreign documents reads as documents with debris
between them rather than as one stream. The merge is right up to the point the
other party controls the rendering.

It is named for the MEDIUM rather than the shape on purpose: "Thread" and
"Timeline" are near-synonyms to a reader, so a tab row carrying both said
nothing about which to open. "Email" also names where what you type actually
goes — out of the workspace, into a real person's inbox.

**Open:** `cmngrdn/docs/inspector-archetypes.md` §9. A `thread` that carries a
COMPOSER still cannot fold into `timeline` until its composer can live in the
chrome footer — a timeline is READ and a thread is WRITTEN.

#### `availability` + `notifications` — resolved 2026-08-16, and they split

Both were used by exactly one surface (cmngrdn's service editor) and both were
"plausibly `settings` sub-sections". Reworking that surface split them, because
**the test for canonical is not how sensible a role reads — it is whether a
SECOND entity would plausibly declare it, and both questions had already been
answered elsewhere in the same module:**

- **`availability` RETIRED.** The booking CALENDAR is the other entity that owns
  availability, and it renders `<AvailabilityEditor>` as a SECTION inside its
  `details` body. The platform had already decided this shape once, one file
  away. Supporting measurement: of the six fields that tab held, four carry ONE
  distinct value across all 11 services in the production network — nobody has
  ever changed padding-before — so it was a compartment with nothing in it.
  Folded into `details` as a "Scheduling" group.
- **`notifications` KEPT**, and the deciding argument is the `settings` gear.
  `settings` is headed for a header gear, which is the right home for chrome
  configuration and the wrong one for substantive per-entity content. A
  service's four message editors ARE its content; behind a gear they would be
  buried. The pass inspector filing `NotificationsTabBody` under `settings` is
  therefore the case that should MOVE, not the precedent to follow.

**The generalisable half:** when deciding whether a narrow role survives, look
for the sibling entity that owns the same concept and see what IT did — and ask
whether the content is configuration (gear) or the entity's own material (tab).
Frequency of use is the weaker signal; both of these had exactly one declarer
and they still split.

#### The `thread` + `activity` → `timeline` merge

Two roles asking one question ("what happened, in order") forced surfaces to
spend two slots on one idea, and pushed at least one over the cap:

- cmngrdn `useRoomInspector` declares **five** — `details · content · thread ·
  activity · settings`. The merge is what brings it back to four.
- Inquiries declares `details · activity · thread`; Contacts declares
  `details · thread · linked`.

A contact's real timeline is one interleaved stream — inquiry received,
appointment booked, SMS sent, reply received — not two tabs the reader has to
join by eye. The atoms for it already exist and are voice-agnostic
(`ActivityFeed` / `ActivityCard` in cmngrdn, hoist candidates), so the caller
resolves operator-voice vs member-voice and the stream stays one component.

Pair the merge with the anchor-vs-roster rule above: once fixed relations move
out of `linked` and into the body's relation strip, a contact reads
`details · timeline` with slots to spare rather than three tabs and no room.

#### Drift note (2026-08-15)

This section, cmngrdn's `CLAUDE.md`, the `TabRole` union, and that union's own
docblock had four different answers — the docblock said "eight roles" over a
ten-member union, and this table listed five roles of which two did not exist.
**When you add a role, update the union, its docblock, and this table together,
and record why the role could not be an existing one.**

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

## lib/activity — the activity vocabulary

**One glyph, one tone and one default label per kind of thing that can happen.
No surface picks its own.** Added v0.49.0, extended v0.50.0.

Every consumer that renders "what happened" was inventing its own event →
(icon, colour) mapping. cmngrdn alone had two and they agreed on nothing — a
pass scan was a Unicode crosshair in one and a circled-dot in the other, and
one painted every event the same accent teal. A third surface would have made
a third.

- **The unit is an ACTION, not an `event_type`.** That string set is volatile:
  an audit found 14 types defined with zero rows AND 10 written in production
  with no def, drifting both directions at once. Binding the design system to
  it means a release every time an app adds an event. Apps map their own
  strings onto `ActivityKind`.
- **`label` is the ONLY overridable field.** The voice belongs to the surface
  — "You visited" on a member-facing feed, "Pass Scanned" on an operator one —
  the glyph and colour do not.
- **Tones are `var()`, never hexes.** A tone is the module that owns the
  action, EXCEPT where one module carries two media you must tell apart.
  Dispatch owns email and SMS; `--cg-channel-email` is blue and
  `--cg-channel-sms` is GREEN, borrowing the convention every phone already
  taught. Failures take STATUS tones — a bounce is a state, not a module.
- **`channelIcon` / `channelColor` / `channelGlyph`** for surfaces that aren't
  an activity row (a channel picker, a list thumb). Same fact, one resolution.
- **Phosphor is a PEER dependency — the package's first.** Optional and
  subpath-only, so a consumer that never imports activity never pulls it. Every
  other atom takes its icon as a prop or draws its own paths, but a vocabulary
  whose whole purpose is deciding the glyph once cannot hand it back.

**Adding to it:** map to an existing kind first. Add a KIND only when the
action is genuinely new, and never re-add a per-surface icon or colour.

