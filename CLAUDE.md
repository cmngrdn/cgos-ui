# cgos-ui — Common Garden design system package

Shared design tokens, atoms, and visual primitives consumed by **cgos** (FastAPI backend — the Vite dashboard was deleted 2026-06-03), **cmngrdn** (Next.js HQ + public site — the active surface), **feather** (feather.fm), and **reliquary** (reliquaryarchives.com).

This file is the conventions doc for working **inside** this repo. For consumption patterns + install instructions see [README.md](README.md). For the multi-phase unification history see [`cgos/docs/design-system-unification-plan.md`](https://github.com/cmngrdn/cgos/blob/main/docs/design-system-unification-plan.md).

## Authority — where each kind of claim lives

Common Garden runs on **per-claim authority, not one hierarchy.** A document may hold
reasoning (a human's — it does not drift), system facts (the code's — generated), and
third-party facts (nobody's here — dated, never generated).

| Question | Owner |
|---|---|
| Why CGOS exists, what must remain true | [**Vision v9 Part I · Philosophy**](https://docs.google.com/document/d/1mqEflqbXe245xc8b0dLoy-IzMO4jEkfd9lsO1QDbOqA/edit) — human-owned, on the Drive. States no facts by construction. |
| What is true *right now* — counts, costs, what is live | [`cgos/docs/state-of-system.md`](https://github.com/cmngrdn/cgos/blob/main/docs/state-of-system.md) — **Vision v9 Part II, generated.** Never quote a figure from prose when this has it. |
| What Feather wants prioritised now | [`cgos/OPS.md`](https://github.com/cmngrdn/cgos/blob/main/OPS.md) — current intent only |
| What is built, blocked, technically next | [`cgos/SCOPE.md`](https://github.com/cmngrdn/cgos/blob/main/SCOPE.md) — the buildboard |
| This repo's conventions and invariants | **this file** — locally authoritative, and it references authority rather than restating it |
| Live facts | the code and the database. Always. |

> **OPS chooses the destination. SCOPE determines the technically valid route.**

If OPS names an outcome and SCOPE shows a prerequisite must land first, doing the
prerequisite **fulfils** OPS rather than contradicting it. Neither overrides a measured
fact. Full reasoning: [`documentation-authority-plan.md`](https://github.com/cmngrdn/cgos/blob/main/docs/documentation-authority-plan.md).

## Design authority — read this first

**cgos-ui is the cross-repo design authority for the entire Common Garden system.** Any design / UI / visual-language decision — a new component, a button restyle, a color choice, a token, a layout pattern, a Google or Apple branded surface — MUST be cross-referenced here, even when the implementation lives in a consumer repo (cmngrdn, cgos, feather, reliquary).

The rule, in order of preference:

1. **First choice — the atom lives here.** If it's pure presentation (no auth, no fetch, no project-specific business logic) it gets built in `ui/` / `lib/` / `passes/` / `preview/` and imported from `cgos-ui/...`. Every consumer pulls from one place; bug fixes / token changes propagate via `npm install`.
0. **A NEW ATOM IS NOT REACHABLE UNTIL IT IS IN `exports`.** `package.json` lists every
   subpath explicitly (`"./ui/Button"`, `"./ui/Button.css"`, …), so a file added under `ui/`
   and shipped in a tagged release still fails to resolve in every consumer:
   `TS2307: Cannot find module 'cgos-ui/ui/X'`. The file is present, this repo has no build to
   fail, and the breakage appears only in a consumer AFTER the tag has been cut and pinned —
   the most expensive possible place to find a one-line omission. `TagListField` shipped in
   v0.51.0 that way and needed v0.51.1 the same minute. **Add the atom AND its companion `.css`
   to `exports` in the same commit as the file.**

   **`npm run audit:exports` now enforces this**, in CI on every push and PR
   (`.github/workflows/exports.yml` — pure node, no install, ~1s). It checks both directions:
   an atom with no entry, an entry pointing at the wrong file, and an entry pointing at a file
   that no longer exists. Verified against the known-bad case rather than trusted on a green
   tick — remove `TagListField` from the map and it fails with the exact message a consumer
   would have hit.

2. **Second choice — the atom lives in a consumer, but is documented here.** When the component bundles project-specific behavior (a download endpoint, an auth header fetch, a cgos API call) that can't reasonably live in cgos-ui, the component stays in the consumer repo. But it MUST get a row in the "Atom inventory" table (`docs/subsystems/atom-inventory.md`), marked with its home repo. The visual contract is locked here regardless of where the code lives. If the visual part can be split out as a pure-presentation badge atom, do that — keep the badge here, compose the data wrapper in the consumer.
3. **Never — silent duplication.** Two copies of the same UI element across repos with slightly-drifted styles is the failure mode every section of this doc exists to prevent.

When in doubt: open this file before reaching for `style={{}}`. Search the inventory table (`docs/subsystems/atom-inventory.md`) for what you need. If it's not there and you're about to build it, the build belongs here.

## Repo role

- Single source of truth for **tokens** (`tokens.css`), **base utility classes** (`base.css`), and **v1 atoms** (`ui/`, `lib/`, `passes/`, `preview/`).
- No deploy. Consumed via `npm install github:cmngrdn/cgos-ui` (or pinned to `#<sha>` for production).
- No npm publish. The GitHub URL is the distribution channel; that lets cgos and cmngrdn both pin to commits independently while staying interoperable.
- No CONTEXT.md / SCOPE.md here — those live in cgos as the hub. Any cgos-ui work that needs scoping shows up as a row in `cgos/SCOPE.md`.

## Subsystem docs — load on demand

Per-subsystem material that used to live in this file moved to `docs/subsystems/` on 2026-09-19, because this file is read in full at every session start and most of it only matters when you are touching one area. A session working in one of these areas opens the matching doc first; `ui/CLAUDE.md` points at the inventory and loads automatically when you read a file under `ui/`. Other repos that cite the inventory or the contract name these files directly, not this one.

| Subsystem | Covers | Doc |
|---|---|---|
| Atom inventory | the single-source-of-truth table — Need / Import from / Notes for every token, base utility and v1 atom, plus the consumer-homed rows (hoist candidates) | [atom-inventory](docs/subsystems/atom-inventory.md) |
| Inspector Contract | cross-repo chrome rules for every inspector / drawer / sheet — architectural model, chrome shape + optional slots, Pattern A/B, `framePolicy`, tab discipline, container rules | [inspector-contract](docs/subsystems/inspector-contract.md) |

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
- ⚠️ **A `lib/` module is unreachable until the EXPORTS MAP names it, exactly like a `ui/` atom — and `audit:exports` only checked one direction until v0.54.1.** It verified that every map ENTRY resolves to a file, never that every MODULE has an entry, so `lib/sms-body.ts` shipped in a tagged v0.54.0, passed the audit, and still failed in the consumer with `Cannot find module 'cgos-ui/lib/sms-body'`. The audit now checks both directions for `lib/` as it already did for `ui/` (`.tsx` counts — `lib/activity.tsx` is a lib module that renders). Same failure the atom section above describes; it just had a second door nobody had shut.
- **`lib/sms-body.ts` renders an operator-authored booking SMS, and is a MIRROR of cgos `awen/sms_body.py` (v0.54.0, 2026-08-26).** Booking texts used to be f-strings in cgos while the matching HQ settings field was email-only and defaulted NULL — the operator's box was empty and a text still went out, so the only wording that shipped was the one she could not read. The bodies are now `appointment_types.*_sms_body`, seeded by a column DEFAULT. **This file exists so the Composer's readout can measure the RENDERED text live**: `{service}` is 9 characters and "6 Hour Session" is 14, so a segment count taken on the template is a different number from the one that gets billed, and a debounced round-trip per keystroke would make the one number she is watching lag the box she is typing in. Pass the rendered preview as the Composer's **`detectionText`** — the prop exists for exactly this ("detections are transport facts and must measure what actually sends"). ⚠️ Keep byte-equivalent with the Python; `cgos/tests/test_sms_body_mirror.py` runs both against one fixture (22 cases). **A preview that disagrees with the send is worse than no preview: it is a settings box that lies with a number attached.** Two rules that look cosmetic and are not — an UNKNOWN tag is left verbatim (blanking `{reschedul_url}` deletes half a sentence and reads as correct), and a trailing clause stranded by an empty tag is dropped WHOLE (removing just "leave a review:" leaves "If you have a moment,"). One character outside GSM-7 forces UCS-2 and cuts the budget 160→70; an em-dash in a draft default measured TWO segments for a 125-character reminder before anything counted it.
- **Per-entity legal identity lives in `lib/legal.ts` (v0.52.0, 2026-08-22).** `lib/consent.ts` owns the STRINGS; this owns WHO IS SAYING THEM. Every CG entity now holds its own A2P 10DLC Brand under a CG ISV Primary, and Twilio's guidance on that architecture is explicit: *"Using your ISV's generic Terms/Privacy Policy is NOT SUFFICIENT for a campaign registered to the customer's brand."* A carrier reviewer verifying a CTA visits the opt-in page and follows its links — a page naming one entity while linking to another's policy is the shape of the **30909** rejection that killed Reliquary's first campaign. **`inPersonOptIn` (v0.53.0) is the second per-entity fact, and it exists because a hardcoded one was wrong:** `buildOptInDisclosure` opened *"in two ways"* for everyone, which is true of Feather's registered message flow and false of Reliquary's, which registers **four** — web, keyword, printed form, verbal script. So her own Privacy Policy contradicted the campaign that cites it, on pages that shipped verified. A count in a shared builder is a claim about every entity that will ever use it; the flag must equal what that entity actually filed, and changing it means resubmitting the campaign in the same pass. `buildEntityIdentification` likewise gained an optional `documentKind: "program"`, because its scope sentence hardcoded *"This policy describes how we collect…personal data"* — correct on `/privacy` and `/terms`, plainly false on an SMS program page. Measured before shipping: of 28 (entity × builder) outputs, **exactly one changed**.
  - **WRAPPER, NOT FORK.** What never varies: the carrier-mandated clauses (`NO_THIRD_PARTY_SHARING`, `STOP_KEYWORDS`, `OPT_IN_KEYWORDS`, `SUPPORTED_CARRIERS`), byte-identical across every door. What varies: the entity, its contact, its domain, and the Terms/Privacy destinations. Platform mechanics are incorporated BY REFERENCE from the Common Garden policy rather than restated per door — three copies of a 500-line policy would drift silently and surface weeks later as a campaign rejection.
  - **`privacyUrlFor(entity)` / `termsUrlFor(entity)` override the module-level `PRIVACY_URL` / `TERMS_URL`.** Those remain the DEFAULT — correct for cmngrdn itself and for any workspace with no front door — but a door registered under its own Brand must link to its OWN pages. Pass them into `renderConsentFinePrintNodes({ privacyHref, termsHref })`, which already accepts the overrides.
  - ⚠️ **Entity punctuation is deliberately inconsistent and must not be normalised** — `Feather Creative, LLC` carries a comma, `Mercedes Creative LLC` does not. They are filed that way and A2P brand vetting matches character-for-character.
  - ⚠️ **`dataRole` is a LEGAL characterisation, not a config flag**, and AHLC's `processor-and-joint` depends on a DPA draft still with counsel. The open questions are in cgos `docs/front-door-legal-pages-plan.md` §218 — **no per-entity page ships before they are answered.** Nothing imports this module yet, which is why merging it published nothing.
- **Carrier-locked consent text is canonical here.** `lib/consent.ts` owns every SMS/email opt-in checkbox string + every auto-reply message (WELCOME, HELP, STOP, START) + the SMS footer template. Consumers (cmngrdn `<CaptureForm>` + `/sms` page + cgos `awen/routers/sms.py` Twilio webhook) ALL import from here so the text never drifts across surfaces — carrier reviewers cross-check the consent screen against the public disclosure page against the welcome SMS they receive, and any mismatch bounces the campaign. Edits to the strings in `lib/consent.ts` require resubmission of every active A2P 10DLC + RCS campaign; don't change them casually. cgos's Python backend can't import TS, so it hand-maintains a MIRROR at `~/cgos/awen/legal/consent.py` — same function names, identical output. Edits must land in both files in the same PR. Dynamic args (`brandName`, `messageTypes`, `frequency`, `supportEmail`) interpolate per call; the carrier-locked frame (CTIA disclosures + ordering + punctuation) is in the function bodies. New workspace tiers needing distinct message-type defaults extend `DEFAULT_MESSAGE_TYPES_BY_KIND`. **Category-split consent (v0.36.0, the CTIA-compliant shape Twilio requires for RCS):** consent is split into **marketing vs non-marketing (transactional), per channel** — four short affirmative checkbox-label builders (`buildMarketingEmailConsentText`, `buildMarketingSmsConsentText`, `buildTransactionalSmsConsentText`, `buildTransactionalEmailConsentText`) say WHAT the fan is opting into, and ONE consolidated disclosure (`buildConsentFinePrint` + the JSX `renderConsentFinePrintNodes`) carries the carrier-required elements (consent-not-a-condition, rate/frequency disclosure, HELP/STOP) once below the form, ending in a single linked **Terms & Conditions**. Funnel→category map: follow / portal / feather splash → marketing email + marketing SMS; booking → transactional SMS. Transactional builders take an optional `topic` (defaults to `"my appointment"`). The legacy single-surface `buildSmsConsentText`/`buildEmailConsentText` are retained for the `/sms` info page until it migrates. The 4-dimension consent model these map to lives on `workspace_contacts.subscribes_{marketing,transactional}_{email,sms}` (cgos schema). **v0.38.0 (2026-06-08)** reworded `buildConsentFinePrint` per a Twilio carrier-review note: it now opens "By submitting your information, you agree to receive marketing and promotional messages from {brand}." and closes with the verbatim tail **Terms & Privacy.** — the Under-18 parental-permission line and the no-sharing clause were dropped, and `renderConsentFinePrintNodes` splits on "Terms & Privacy" to wrap **Terms** (→ `TERMS_URL`) and **Privacy** (→ `PRIVACY_URL`) as two separate links. (v0.37.0 was a same-day predecessor that ended in a single "Terms & Conditions" link; superseded before any deploy.) Lockstep edit landed in `~/cgos/awen/legal/consent.py` + the `tests/test_consent_mirror.py` snapshot. **Canonical reference + the authoritative cross-repo surface list: [`docs/consent.md`](docs/consent.md)** — keep it current when adding any surface that shows or records consent (e.g. the feather.fm `/<slug>` portal capture form added 2026-06-16).

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

