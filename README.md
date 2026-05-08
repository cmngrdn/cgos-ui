# cgos-ui

Shared design tokens, atoms, and visual primitives for the Common Garden ecosystem — one source of truth across `cgos`, `cmngrdn`, `feather`, and `reliquary`.

> **Status:** v0.20.0 — Phases 1 + 2 + 3 + 4.1 complete; cross-cutting `preview/` module landed (2026-05-08). Tokens + atoms + lifted libs + DevicePreview v2. Both consumer repos (cgos dashboard + cmngrdn) consume directly.

See [`docs/design-system-unification-plan.md`](https://github.com/cmngrdn/cgos/blob/main/docs/design-system-unification-plan.md) in the cgos repo for the multi-phase plan, audit findings, and architecture decisions.

---

## Install

This package is consumed via a GitHub URL — no npm publish.

```bash
npm install github:cmngrdn/cgos-ui
```

To pin to a specific commit (recommended for production deploys):

```bash
npm install github:cmngrdn/cgos-ui#<sha>
```

## Use

Import the full CSS bundle from your app's top-level CSS file:

```css
@import "cgos-ui/index.css";
```

Or import pieces independently:

```css
@import "cgos-ui/tokens.css";   /* :root variables only — colors, spacing, motion, glass tokens */
@import "cgos-ui/base.css";     /* utility classes — typography, glass, elevation, hairlines */
```

After import, all `--cg-*` CSS variables are available globally and the utility classes (`.cg-text-*`, `.cg-glass`, `.cg-glass-floating`, `.cg-elev-1..5`, `.cg-iridescent-text`, `.cg-dotted-field`, `.cg-hairline`) can be applied to any element.

## What's in here

### `tokens.css` — design tokens

Drop-in `:root` declarations covering the entire token vocabulary:

- **Colors** — backgrounds, text, borders, surface raises, accent (teal Awen) + warm (amber), six artist accents, brand gradient, iridescent stroke, garden petal stops
- **Status palette** — basic 5-color (green/red/amber/cyan/magenta) + semantic 7-color (success/warning/danger/blue/purple/neutral/archived)
- **Typography** — Outfit (display/body) + JetBrains Mono (monospace), four named font weights (light/regular/medium/semibold)
- **Spacing** — `xs..2xl` (4–48px)
- **Radii** — `sm..xl` + `full` (4–100px)
- **Backdrop** — overlay color for modals
- **Bloom** — atmospheric tint controls (`--cg-bloom-h/s/opacity`)
- **Elevation** — five-tier depth scale (`--cg-elev-1..5`) plus legacy aliases (`--cg-shadow-sm/md/lift`)
- **Motion** — durations + four named easings (default ease-in-out, entry decelerate, exit accelerate, HIG emphasized)
- **Glass** — Liquid Glass surface system: backgrounds, borders, blurs, shadows, radii. Theme-aware via `color-mix`
- **Light theme override** — activated by `[data-theme="light"]` on `:root`. Overrides only what differs (backgrounds, text, borders, elevation shadows, backdrop, bloom)

### `base.css` — utility classes

- `.cg-text-hero` `.cg-text-display` `.cg-text-title` `.cg-text-body` `.cg-text-small` `.cg-text-label` `.cg-text-label-sm` `.cg-text-micro` `.cg-text-mono`
- `.cg-glass` `.cg-glass-floating`
- `.cg-elev-0..5`
- `.cg-dotted-field` `.cg-dotted-field-fine`
- `.cg-iridescent-text`
- `.cg-hairline` `.cg-hairline-iridescent`
- `@keyframes cg-spin` (used by Spinner + Button loading state)
- `@keyframes cg-progress-indeterminate` (used by ProgressBar)
- `@keyframes cg-modal-fade` + `cg-modal-rise` (used by Modal)

### `ui/` — atoms (v0.13.0)

Imported via subpath. Each atom is self-contained TSX + (optional) companion CSS auto-loaded by `cgos-ui/index.css`.

```ts
import { Button } from 'cgos-ui/ui/Button'
import { IconButton } from 'cgos-ui/ui/IconButton'
import { Spinner } from 'cgos-ui/ui/Spinner'
import { Badge } from 'cgos-ui/ui/Badge'
import { Toggle } from 'cgos-ui/ui/Toggle'
import { ProgressBar } from 'cgos-ui/ui/ProgressBar'
import { EmptyState } from 'cgos-ui/ui/EmptyState'
import { Modal } from 'cgos-ui/ui/Modal'
import { ChipToggle, ChipSelect, ChipGroup, ChipSegment } from 'cgos-ui/ui/ControlChip'
```

| Atom | Variants × Sizes | Notes |
|------|------------------|-------|
| **Button** | 6 × 4 | primary / ghost / accent / danger / link / glass; xs/sm/md/lg; loading state, iconLeft/Right, fullWidth, glass+pill. Visual brief: [`docs/button-atom-brief.md`](https://github.com/cmngrdn/cgos/blob/main/docs/button-atom-brief.md) |
| **IconButton** | 4 × 4 | ghost / subtle / accent / danger; xs/sm/md/lg; active-toggle (aria-pressed); xs skips hover-bg lift |
| **Spinner** | n/a × 4 | sm/md/lg/xl; default tint `--cg-accent`, override via `color` prop |
| **Badge** | 3 × 2 × 8 | subtle / outline / solid; sm/md; 8 status tones; supports `dot` + `uppercase` |
| **Toggle** | 4 × 2 | accent / success / warning / danger; sm/md; `role="switch"` + `aria-checked` baked in |
| **ProgressBar** | 5 tones, determinate or indeterminate | accent / success / warning / danger / neutral |
| **EmptyState** | 2 sizes | sm/md; icon + title + description + optional action |
| **Modal** | n/a | Glass-frosted backdrop (`backdrop-filter: blur(8px) saturate(140%)` + `--cg-backdrop` tint), opaque surface, click-outside + Esc close |
| **ControlChip** | 4 sub-atoms | ChipToggle + ChipSelect (portal-rendered dropdown) + ChipGroup + ChipSegment. 28px pill height across all |

### `lib/` — typed contracts shared across repos

- `lib/pass-art.ts` — `PassArt`, `PassEra`, `PassArtVariant`, `EMPTY_PASS_ART`, `resolveLevelArt()`, `resolveActivePassArt()`
- `lib/dossier.ts` — `Dossier`, `DossierMission`, `DossierService`, `DossierTransmission`, `DossierGroveMember`, `EMPTY_DOSSIER`, `TRANSMISSION_KINDS`

### `passes/` — visual primitives

- `passes/PassCard.tsx` — `PassCard` + `PassCardInWallet` (Apple Wallet pass approximation, 320×400, optional `scale` prop and Wallet chrome wrapper)

### `preview/` — device-frame preview chrome (v0.20.0+)

The cross-cutting "edit-with-live-preview" surface for portals, dossiers, inquiry forms, and any future builder. Same chrome everywhere.

```ts
import {
  DeviceIframePreview,
  DeviceSubtreePreview,
} from 'cgos-ui/preview/DevicePreview'
import { MobileFrame } from 'cgos-ui/preview/MobileFrame'
import { DesktopFrame } from 'cgos-ui/preview/DesktopFrame'
```

| Export | Use when |
|--------|----------|
| **`<DeviceIframePreview url=… />`** | Previewing a live URL. Renders an `<iframe>` inside the device chrome. Bump the iframe to reload via `ref.current?.refresh()` (or the toolbar reload button) after a parent save. |
| **`<DeviceSubtreePreview>`** | Previewing arbitrary React content. No iframe — props update in-place, no reload. Preferred for in-context editors (Phase 2 dossier surface). |
| **`<MobileFrame>`** | Standalone iPhone 15 Pro silhouette. Use when you want the chrome without the viewport-toggle toolbar. |
| **`<DesktopFrame>`** | Standalone browser-window silhouette (max-width 1280px). |

Both `Device*Preview` variants:
- Default to **mobile** viewport (most authoring surfaces are mobile-dominant).
- Accept `viewport` (controlled) OR `defaultViewport` (uncontrolled). Pass `onViewportChange` to observe in either mode.
- Same toolbar chrome — viewport toggle pills, optional reload (iframe variant only).

Phase 4 (Expo wrap) note: `DeviceSubtreePreview` is the native-portable variant. RN has no `<iframe>`; iframe-variant consumers pick up a `WebView`-shimmed leaf at native time.

## Local development

When iterating on `cgos-ui` changes from a consumer repo, use `npm link` to avoid the publish/reinstall round-trip:

```bash
# In ~/GitHub/cgos-ui:
npm link

# In ~/cgos (or any consumer):
npm link cgos-ui
```

Now edits to `~/GitHub/cgos-ui/tokens.css` are immediately picked up by the consumer's dev server (Vite HMR / Next.js Fast Refresh).

To stop linking and go back to the GitHub-hosted version:

```bash
# In the consumer repo:
npm unlink --no-save cgos-ui
npm install
```

### Vite + npm-link gotcha — clear `.vite` cache after adding new `@import` entries

When you add a new `@import "./ui/X.css"` to `cgos-ui/index.css` and the consumer is on `npm link`, Vite's per-package CSS dependency graph sometimes caches the previous `@import` chain and silently drops the new file. Symptom: the new atom's CSS is fetched (visible in the network tab) but its rules don't appear in the page's loaded stylesheets, so styles don't apply.

**Fix:** stop the dev server, `rm -rf node_modules/.vite` in the consumer repo, restart. The chain re-resolves cleanly. No fix needed when consuming via `github:` URL — only an issue with linked packages.

### Next.js + Turbopack — add `transpilePackages: ["cgos-ui"]`

Turbopack doesn't transpile TSX inside `node_modules` by default. Without this opt-in, `npm run build` fails with "Unknown module type" on every cgos-ui atom import:

```ts
// next.config.ts
const nextConfig = {
  transpilePackages: ["cgos-ui"],
  // ...
}
```

cgos's Vite handles this natively via `@vitejs/plugin-react` — no opt-in needed.

## Architecture decisions

Locked 2026-05-02 in the plan doc. Summarized:

| Decision | Choice |
|----------|--------|
| Distribution | Separate GitHub repo, installed via `github:` URL |
| Animation engine | framer-motion as cross-repo standard |
| Atom styling | Inline-style + CSS vars (no Tailwind dependency) |
| Aesthetic reference | cmngrdn's polished glass-aware look — cgos upgrades to match |

## Roadmap

- **Phase 1** ✅ — token consolidation (2026-05-02)
- **Phase 2** ✅ — atom library v1: Button, IconButton, Spinner, Badge, Toggle, ProgressBar, EmptyState, Modal, ControlChip; mirror files lifted (PassCard, pass-art, dossier types) (2026-05-02)
- **Phase 3** — Liquid Glass primitives: material atoms, depth-elevation system, motion primitives, HIG interaction states
- **Phase 4.1** ✅ — sub-atoms (Card, Input + Textarea, Select) (2026-05-07)
- **Phase 4.2** — Chip, SegmentedControl; orb animation reconciliation
- **DevicePreview v2** ✅ — `preview/` module (DeviceIframePreview + DeviceSubtreePreview, MobileFrame, DesktopFrame) (2026-05-08, v0.20.0)
- **Phase 5** — native shell exploration (deferred)

## License

UNLICENSED — Common Garden internal package.
