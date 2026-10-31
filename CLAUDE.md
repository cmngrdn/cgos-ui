# cgos-ui — Common Garden design system package

Shared design tokens, atoms, and visual primitives consumed by **cmngrdn** (Next.js HQ + public site — the active surface), **feather** (feather.fm), and **reliquary** (reliquaryarchives.com). **cgos** (the FastAPI backend) installs nothing from here; it keeps Python mirrors of `lib/consent.ts` and `lib/sms-body.ts`, held to this package by its fixture tests.

This file is the conventions doc for working **inside** this repo. For consumption patterns + install instructions see [README.md](README.md). For the multi-phase unification history see [`cgos/docs/design-system-unification-plan.md`](https://github.com/cmngrdn/cgos/blob/main/docs/design-system-unification-plan.md).

**This repo is PUBLIC.** Nothing private goes in it — no Drive ids, no credentials, no member data, no internal hostnames beyond the public domains already named.

**This file is read in full at every session start, so it holds only what an arbitrary session needs: rules and pointers. Detail lives in the doc that owns it (§ Where things go). No history here — incident stories and dates of past fixes belong in [`docs/patterns.md`](docs/patterns.md).**

## Authority — where each kind of claim lives

Common Garden runs on **per-claim authority, not one hierarchy.**

| Question | Owner |
|---|---|
| Why CGOS exists, what must remain true | [**Vision v9 Part I · Philosophy**](https://docs.google.com/document/d/1mqEflqbXe245xc8b0dLoy-IzMO4jEkfd9lsO1QDbOqA/edit) — human-owned, on the Drive. States no facts by construction. |
| What is true *right now* — counts, costs, what is live | [`cgos/docs/state-of-system.md`](https://github.com/cmngrdn/cgos/blob/main/docs/state-of-system.md) — **Vision v9 Part II, generated.** Never quote a figure from prose when this has it. |
| What Feather wants prioritised now | [`cgos/OPS.md`](https://github.com/cmngrdn/cgos/blob/main/OPS.md) — current intent only |
| What is built, blocked, technically next | [`cgos/SCOPE.md`](https://github.com/cmngrdn/cgos/blob/main/SCOPE.md) — the buildboard |
| This repo's conventions and invariants | **this file** — locally authoritative, and it references authority rather than restating it |
| Paired Drive folder | **none** — this repo is public and never carries Drive ids |
| Live facts | the code and the database. Always. |

> **OPS chooses the destination. SCOPE determines the technically valid route.** Full reasoning: [`documentation-authority-plan.md`](https://github.com/cmngrdn/cgos/blob/main/docs/documentation-authority-plan.md).

## Design authority — read this first

**cgos-ui is the cross-repo design authority for the entire Common Garden system.** Any design / UI / visual-language decision — a new component, a button restyle, a color choice, a token, a layout pattern, a Google or Apple branded surface — MUST be cross-referenced here, even when the implementation lives in a consumer repo (cmngrdn, cgos, feather, reliquary).

The rule, in order of preference:

1. **First choice — the atom lives here.** If it's pure presentation (no auth, no fetch, no project-specific business logic) it gets built in `ui/` / `lib/` / `passes/` / `preview/` and imported from `cgos-ui/...`. Every consumer pulls from one place; bug fixes / token changes propagate via `npm install`.
2. **Second choice — the atom lives in a consumer, but is documented here.** When the component bundles project-specific behavior (a download endpoint, an auth header fetch, a cgos API call) that can't reasonably live in cgos-ui, the component stays in the consumer repo. But it MUST get a row in the "Atom inventory" table (`docs/subsystems/atom-inventory.md`), marked with its home repo. The visual contract is locked here regardless of where the code lives. If the visual part can be split out as a pure-presentation badge atom, do that — keep the badge here, compose the data wrapper in the consumer.
3. **Never — silent duplication.** Two copies of the same UI element across repos with slightly-drifted styles is the failure mode every section of this doc exists to prevent.

When in doubt: open this file before reaching for `style={{}}`. Search the inventory table (`docs/subsystems/atom-inventory.md`) for what you need. If it's not there and you're about to build it, the build belongs here.

## Repo role

- Single source of truth for **tokens** (`tokens.css`), **base utility classes** (`base.css`), and **v1 atoms** (`ui/`, `lib/`, `passes/`, `preview/`).
- No deploy. Consumed via `npm install github:cmngrdn/cgos-ui` (or pinned to `#<sha>` for production).
- No npm publish. The GitHub URL is the distribution channel; that lets cgos and cmngrdn both pin to commits independently while staying interoperable.
- No CONTEXT.md / SCOPE.md here — those live in cgos as the hub. Any cgos-ui work that needs scoping shows up as a row in `cgos/SCOPE.md`. **Never state a consumer's pin here** — each consumer's `package.json` owns it.

## Subsystem docs — load on demand

A session working in one of these areas opens the matching doc first. `.claude/rules/<slug>.md` loads it automatically when you read a matching file, and `ui/CLAUDE.md` points at the inventory for anything under `ui/`. Other repos that cite the inventory or a contract name these files directly, not this one.

| Subsystem | Covers | Doc |
|---|---|---|
| Atom inventory | the single-source-of-truth table — Need / Import from / Notes for every token, base utility and v1 atom, plus the consumer-homed rows (hoist candidates) | [atom-inventory](docs/subsystems/atom-inventory.md) |
| Tokens | every `--cg-*` family — colour, status, data-viz, glass, fills, elevation, motion, layers, control heights, chrome geometry, channels, app colours | [tokens](docs/subsystems/tokens.md) |
| Type and space | the UI type roles, the 4-point grid, density tokens | [type-and-space](docs/subsystems/type-and-space.md) |
| Surfaces and atom CSS | glass · fill · pill, the widget contract, the inspector body, resting state in companion CSS | [surfaces](docs/subsystems/surfaces.md) |
| Package exports | why every subpath is listed in `package.json`, and what `audit:exports` checks | [package-exports](docs/subsystems/package-exports.md) |
| Legal and consent | `lib/consent.ts`, `lib/legal.ts`, `lib/sms-body.ts` and their cgos Python mirrors; surface list in [consent.md](docs/consent.md) | [legal-and-consent](docs/subsystems/legal-and-consent.md) |
| Activity vocabulary | `lib/activity` — one glyph, tone and label per kind of event | [activity](docs/subsystems/activity.md) |
| Hard rules in consumers | what a consumer must never hand-roll | [consumer-rules](docs/subsystems/consumer-rules.md) |
| Window | the app window, its band and four modes, the record head, the stub, the marks — cites cgos `hq-system.md` | [window-contract](docs/subsystems/window-contract.md) |
| Tools row (history) | the bar above a list — retiring (W5) | [tools-row-contract](docs/subsystems/tools-row-contract.md) |
| Inspector Contract (history) | cross-repo chrome rules for every inspector / drawer / sheet | [inspector-contract](docs/subsystems/inspector-contract.md) |
| List rows | `UniversalListRow` adoption | [list-row-template](docs/list-row-template.md) |

## Where things go

Every statement has one home. Write it there, not in the file you happen to have open.

| You learned… | It goes in | Not in |
|---|---|---|
| A new atom, token or variant — what it is and where to import it | its row in [atom-inventory](docs/subsystems/atom-inventory.md) (tokens: [tokens](docs/subsystems/tokens.md)) | CLAUDE.md |
| How one area of the package works | `docs/subsystems/<slug>.md` | CLAUDE.md |
| A rule that applies to an arbitrary session here | one line in CLAUDE.md | — |
| A lesson from an incident or a measurement ("don't change this, because…") | [docs/patterns.md](docs/patterns.md), why + how-to-apply | CLAUDE.md |
| What changed in a release | the commit and the tag | any doc |
| A consumer's pin, a consumer's adoption state | that consumer's `package.json` and docs | this repo |
| A plan for something not built yet | cgos `SCOPE.md` + a doc with one row in cgos `docs/doc-map.md` | this repo |
| Anything private | nowhere in this repo — it is public | — |

## Hard rules

- **Tokens are the source of truth.** If a consumer needs a color/space/motion value, it has to be a `--cg-*` token. New tokens land in `tokens.css` first; consumers reference them by var name. Never inline hex/rgba in atom CSS.
- ⚠️ **Every `var(--cg-*)` in an atom carries its literal as a fallback** — `var(--cg-control-h-md, 40px)`. Verify a new token with `getComputedStyle` in a consumer, not by grepping the file. [tokens](docs/subsystems/tokens.md)
- **Atoms are presentational.** No data fetching, no auth checks, no business logic. If an atom needs context, it takes props.
- **An atom's resting state belongs in its companion CSS, never in an inline `style`.** If a consumer reaches for `!important` against an atom, that is the atom's bug. [surfaces](docs/subsystems/surfaces.md)
- **A new `ui/` atom or `lib/` module is not reachable until `package.json` `exports` names it** (plus its companion `.css`), in the same commit as the file. `npm run audit:exports` checks both directions in CI. [package-exports](docs/subsystems/package-exports.md)
- **One atom per concept.** If the same UI element shows up in two consumers with subtle styling differences, it's a missing atom variant, not a reason to fork.
- **Cross-consumer changes ship through this repo.** Don't patch a copy in cgos or cmngrdn — change the atom here, bump the version, both consumers update.
- **Mirror types live here.** `lib/dossier.ts`, `lib/pass-art.ts` and similar shared TypeScript types are owned by cgos-ui and re-exported by both consumers via shim files. Never define the canonical type in a consumer.
- **Carrier-locked text is canonical here and mirrored in cgos Python.** An edit to `lib/consent.ts`, `lib/legal.ts` or `lib/sms-body.ts` lands in the cgos mirror in the same change, and a change to consent strings means resubmitting every active A2P 10DLC + RCS campaign. Entity punctuation is filed character-for-character — never normalise it. [legal-and-consent](docs/subsystems/legal-and-consent.md)
- **Surfaces: depth is spent once.** No card inside a card, no hand-rolled glass, nothing inside an inspector body may be a card. [surfaces](docs/subsystems/surfaces.md)

## Versioning + consumption

`package.json` `version` bumps follow:
- **Patch (0.20.x):** bug fixes, no API change.
- **Minor (0.x.0):** new atom, new variant, new token. Backwards-compatible.
- **Major (x.0.0):** breaking change to an atom's prop signature or a token rename. Coordinate consumer updates.

Consumers pin via `package.json` `dependencies` (`github:cmngrdn/cgos-ui#v<tag>`). A new atom is not available in a consumer until that consumer is re-pinned and retested. To live-iterate locally, `cd cgos-ui && npm link`, then `npm link cgos-ui` in the consumer (cmngrdn, feather or reliquary).

**Checks:** `npm run audit:exports` (CI, `.github/workflows/exports.yml`), `audit:type`, `audit:apps`, `audit:emoji`, `audit:composer`. Run the one that covers what you touched before tagging.

## Don't do

- Don't add a CONTEXT.md or SCOPE.md to this repo. Hub conventions live in cgos.
- Don't add a README that duplicates this file. README is for "how do I install + use this"; CLAUDE.md is for "how do I work inside this repo."
- Don't extract atoms back to a consumer repo. New atoms land here first.
- Don't define a shared TypeScript type (Dossier, PassArt, etc.) in a consumer. Define here, re-export from consumers.
