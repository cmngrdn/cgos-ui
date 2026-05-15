# cgos-ui — Common Garden design system package

Shared design tokens, atoms, and visual primitives consumed by **cgos** (FastAPI backend + frozen Vite dashboard), **cmngrdn** (Next.js HQ + public site — the active surface), **feather** (feather.fm), and **reliquary** (reliquaryarchives.com).

This file is the conventions doc for working **inside** this repo. For consumption patterns + install instructions see [README.md](README.md). For the multi-phase unification history see [`cgos/docs/design-system-unification-plan.md`](https://github.com/cmngrdn/cgos/blob/main/docs/design-system-unification-plan.md).

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

## Single source of truth atom inventory

Tokens + base utility classes + v1 atoms. To add or change a token, edit `tokens.css`, push, then `npm install` in consumers (or `npm link cgos-ui` for live local iteration).

| Need | Import from | Notes |
|------|-------------|-------|
| Pill / filter chip / segmented toggle | `cgos-ui/ui/ControlChip` → `ChipToggle`, `ChipSelect`, `ChipMultiSelect`, `ChipGroup`+`ChipSegment` | 28px height, the only pill atom. Do not roll your own. `ChipSelect` for single-select (sort, lens, view); `ChipMultiSelect` for filters where 2+ values make sense (status, tag, channel). Multi auto-shows a search-within input when options > 8. |
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
| Native select dropdown | `cgos-ui/ui/Select` | Native `<select>` wrapper with custom CSS chevron. sm + md sizes. For chip-style multi-option dropdowns prefer `ChipSelect`. |
| Card surface | `cgos-ui/ui/Card` (React wrapper) OR `.cg-card` / `.cg-card-interactive` (className) | Variants: `resting` + `interactive` (hover lift + press snap + focus ring). Polymorphic via `as` prop including `as="button"` (auto-resets default button styling). Don't pair with `style={{ all: 'unset' }}`. |
| FieldDot indicator | `cgos-ui/ui/FieldDot` | "Lit up" form-field indicator — neutral grey when empty, accent with glow when filled, 200ms transition. Sizes `sm`/`md`/`lg`. |

## Token surface

Tokens live in `tokens.css` under `:root` (dark default) + `:root[data-theme="light"]` (light overrides).

- **Color:** `--cg-bg`, `--cg-bg-elevated`, `--cg-bg-surface`, `--cg-text`, `--cg-text-secondary`, `--cg-text-dim`, `--cg-text-muted`, `--cg-border`, `--cg-border-hover`, `--cg-border-subtle`, `--cg-accent`, `--cg-accent-dim`, `--cg-accent-glow`, `--cg-accent-subtle`, `--cg-backdrop`.
- **Status palette:** `--cg-status-success / warning / danger / blue / purple / neutral / archived / green / red / amber / cyan / magenta`. Consumed via `types/status.ts` maps in consumer repos.
- **Glass system:** `--cg-glass-bg`, `--cg-glass-bg-strong`, `--cg-glass-blur`, `--cg-glass-blur-strong`, `--cg-glass-border-top` (rim highlight, `var(--cg-text) 38%`), `--cg-glass-border-strong`, `--cg-glass-radius-sm/md/lg/pill`.
- **Elevation:** `--cg-elev-0` through `--cg-elev-5` — five-tier shadow scale.
- **Typography classes:** `.cg-text-hero/display/title/body/small/label/label-sm/micro/mono/caption/callout`. Prefer these over inline `fontSize`/`fontWeight`.
- **Motion easings:** `--cg-ease-entry` (decelerate, *appearing* surfaces), `--cg-ease-exit` (accelerate, *dismissing* surfaces), `--cg-ease` (bidirectional state changes), `--cg-ease-emphasize` (rare HIG featured motion).

## Hard rules in consumers (enforced in review)

- **No hardcoded hex or rgba in `style={}` props or inline CSS.** Use tokens. If a token is missing, add it to `tokens.css` here first. Enforced by ESLint in cmngrdn + cgos: `no-restricted-syntax` selectors descending from `JSXAttribute[name.name='style']`.
- **No new raw `<button className="...">` for text/CTA buttons.** Use `<Button>`. Default variant is `primary`.
- **No new `<button style={{ all: 'unset' }}>` with just an icon.** Use `IconButton`.
- **No new inline switch/toggle built from `<button>` + dot div.** Use `Toggle`.
- **No new centered overlays built from scratch.** Use `Modal`.
- **No new status pill built from `<span style={{ padding, border, color: '#...' }}>`.** Use `Badge`.
- **No per-file `tabStyle()` or `btn()` helper functions.** Reuse the consumer's `PageHeader` / `Tabs` atom or extend an existing atom.
- **One atom per concept.** If you catch yourself building a second version of something already in `ui/`, stop and extend the existing atom instead.

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
