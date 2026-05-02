# cgos-ui

Shared design tokens, atoms, and visual primitives for the Common Garden ecosystem — one source of truth across `cgos`, `cmngrdn`, `feather`, and `reliquary`.

> **Status:** Phase 1 — token consolidation. CSS-only package. Atoms (`Button`, `Toggle`, `Badge`, etc.) land in Phase 2.

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

## Architecture decisions

Locked 2026-05-02 in the plan doc. Summarized:

| Decision | Choice |
|----------|--------|
| Distribution | Separate GitHub repo, installed via `github:` URL |
| Animation engine | framer-motion as cross-repo standard |
| Atom styling | Inline-style + CSS vars (no Tailwind dependency) |
| Aesthetic reference | cmngrdn's polished glass-aware look — cgos upgrades to match |

## Roadmap

- **Phase 1** ⏳ — token consolidation (this release)
- **Phase 2** — atom library: Button, IconButton, Toggle, Badge, Modal, Spinner, ProgressBar, EmptyState, ControlChip
- **Phase 3** — Liquid Glass primitives: material atoms, depth-elevation system, motion primitives, HIG interaction states
- **Phase 4** — sub-atoms (Input, Select, Card, Chip, SegmentedControl); orb animation reconciliation
- **Phase 5** — native shell exploration (deferred)

## License

UNLICENSED — Common Garden internal package.
