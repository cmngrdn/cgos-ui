# List Row + Tile Template — Universal Contract

The visual contract for every list and grid surface across HQ (`cmngrdn` + `cgos` dashboard) and any future Common Garden product surface. Locks the row skeleton so the eye can predict layout the moment it lands on a new module.

This is a **contract doc**, not an implementation log. The matching atoms are `cgos-ui/ui/UniversalListRow`, `cgos-ui/ui/UniversalCard` and `cgos-ui/ui/UniversalTile`, with their shared vocabulary in `cgos-ui/lib/list` — **hoisted from cmngrdn in v0.71.0**. Until then this line said "(forthcoming)" and the atoms lived in cmngrdn `src/components/hq/list/`, so the canonical contract pointed at code that did not exist in the repo that owned it. cmngrdn's consumers still import the local copy until the list-chrome sweep moves them (cmngrdn `docs/list-chrome-standard.md` Phase 4).

**Four archetypes, one family:**

| Archetype | Atom | Height | Use when |
|---|---|---|---|
| **Record row** | `UniversalListRow` | 64 / 72 mobile | a list of things you open one at a time |
| **Card** (detailed tier) | `UniversalCard` | min 76 | the same records, when one line cannot carry the payload — facts + one signal |
| **Tile** | `UniversalTile` | grid | image-forward browsing |
| **Table row** | `ColumnGrid` + `ColumnHeader` + `ColumnRow` | 56 | a grid you scan and sort BY COLUMN |

The bar above any of them is governed separately: [`subsystems/tools-row-contract.md`](subsystems/tools-row-contract.md).

## Why this exists

Every `/hq/*` module list before this contract rolled its own chip arrangement: a type chip, a status chip, a date column, a thumbnail icon — different orderings, different widths, different priorities. Result: rows looked inconsistent across modules, mobile views were chip-cluttered, the eye couldn't predict where to look. The chips were also redundant — a type icon in the thumbnail fallback PLUS a `VIDEO` chip in the row, both saying the same thing.

This template collapses every list row into a **3-zone grammar** with predictable slots. Type and status leave the chip layer entirely and become non-text cues (icon-in-thumb, color spine). The reclaimed horizontal real estate goes to titles + progress.

## The grammar — three zones

Every list row is exactly three zones, in this order:

```
┌─[1]─┬─[2]─────────────────────────────────────────────┬─[3]──────┐
│Spine│ Thumb │ Name                                     │ Progress │
│     │       │ Sub-meta                                 │  •••••   │
│     │       │                                          │ ⓘ  ↗     │
└─────┴─────────────────────────────────────────────────┴──────────┘
  3px   40px                                              ~120-180px
```

1. **Left spine — 3px colored bar.** Status signal. Always present, always the same width. Color sourced from the module's status → `--cg-status-*` token map (no inline hex).
2. **Body — left-aligned, fills available width.** Thumbnail (40px, fixed) + Name (single line, truncates with ellipsis) + Sub-meta (single line below name, dim text, truncates). Sub-meta content varies per module (see field-mapping matrix below). No chips, no inline status, no date columns.
3. **Right anchor — fixed-width cluster.** Either a **progress meter** (5 dots, 60px) OR a **timestamp** (mono uppercase, ~80px) — see variants. Optionally followed by 1-2 action buttons. Buttons render **disabled-but-present** when N/A so the right edge stays optically locked across rows in the same list.

**Universal rule: no chips inside the body zone.** Chips are forbidden in list rows. Type → corner icon on thumbnail (desktop only) OR the thumbnail's centered fallback icon (when no image). Status → left spine. Channel/category → typographic mark in the thumbnail slot.

**Selection rows reserve a 4th column** between the spine and the thumb via the optional `selectionSlot` prop. The spine ALWAYS stays at the row's visible left edge — never wrap a `<UniversalListRow>` in a selection container that adds padding-left, because the spine then sits 30px inward of where it should. Audience is the canonical consumer; mirror its pattern for any new selection-enabled list.

## Row height

Single row height across every module, every viewport:

- Desktop: **64px**
- Mobile (≤767px): **72px** (the extra 8px buys vertical breathing for the two-line name + sub-meta stack)

Locked. Sweep any module that doesn't comply.

**Exemption:** `/hq/work/inquiries` has multi-column workspace-curated layout — leave it alone for now. Inquiries gets the left spine only; the rest of its row is per-workspace business.

## Three variants

Same template, three right-anchor flavors:

### `rightAnchor: "progress"` — for entity lists
Right zone = 5-dot progress meter + optional copy/link action buttons.

Used by: Library (Projects / Assets / Portal Pages / Documents), Journey (Missions), Comms (Transmissions when in draft state), Offerings (Products / Tickets).

### `rightAnchor: "time"` — for chronological lists
Right zone = mono-uppercase timestamp + optional context action.

Used by: Work (Appointments), Comms (SMS Inbox), Activity, Home / Dashboard latest activity preview, Chat (Awen sessions), Admin (Tasks).

### `rightAnchor: "none"` — for spine-only lists
Right zone = empty (or a single action `⋯` if needed).

Used by: Comms (Audience), Pulse (Tags — `/hq/analytics/tags`, post-V2 Phase C consolidation), Workspace (Members), Admin (Workspaces).

## Tile sibling — `UniversalTile`

For grid view. Strict skeleton:

```
┌──────────────────┐
│ ▔▔▔▔ spine ▔▔▔▔ │  ← top edge, 3px
│                  │
│      thumb       │  ← 1:1 OR module aspect
│                  │
│ Name             │  ← single line, truncates
│ Sub-meta         │  ← single line, dim — SAME content as list-row sub-meta
│ ••••• (or slot)  │  ← progress dots OR module-specific slot
└──────────────────┘
```

**Rule: tile + list view share field-mapping.** The sub-meta line in the tile renders the same content as the sub-meta line in the corresponding list row (asset count for Projects, parent project for Assets, /slug for Portal Pages, segment tags for Transmissions, email+phone for Audience). The eye should read the same information in either view — switching between grid and list is just a chrome change, not a data change.

**Bottom slot is the only varying part:**
- Library / Portal Pages / Transmissions → progress dots
- Collectibles → edition number (e.g. `#0042 / 100`)
- Passes → exempt (PassCard is its own atom)

Tile bottom-slot is the only place per-module variation lives. Everything else (spine on top, thumb sizing, name + sub-meta styling) is locked.

## Card sibling — `UniversalCard`

The **detailed tier**: the middle density between the 64px row and the tile. `UniversalCard`'s docblock has cited this section since it shipped; it did not exist until v0.71.0, so the tier with the richest grammar was the only one without a spec. This describes what is implemented.

```
▎ [media]  TYPE · SUB · TIME                 FACT   FACT   ┌ signal ┐  chip chip  ⓘ ↗
▎  48px    Name (15px, one line)             value  value  └────────┘
spine                                        └ 0–3 ┘ └ ONE ┘ └ footer ┘
```

**Seven slots, in order:** spine · media · eyebrow · name · facts · signal · footer (chips + ≤2 actions).

- **Spine** — the same `SpineToken` as the row. Status leaves the chip layer here too.
- **Media** — the row's thumb vocabulary (`image` / `icon` / `mark` / `swatch`) plus a `date` block for time-anchored records. 48px.
- **Eyebrow** — `typeLabel · subLabel · timestamp`, uppercase micro type. The type the row puts in its thumb corner is written out here.
- **Facts** — `CardFact { label, value }`, **0–3**, fixed 92px lanes so they align down the list. These are the "more than a row" payload.
- **Signal** — `CardSignal`, **exactly one**, adapter-picked: `progress` · `stat` · `pill` · `sparkline` · `custom` · `none`. A transmission shows a status `pill`, a release a `sparkline`, a crew member a completeness `progress`, a pay period a `stat`. Fixed 168px lane.
- **Footer** — `CardChip`s (quiet metadata: format, rarity, world) and the row's `RowAction` pair.

**Why chips are allowed here and not in a row.** The no-chips rule governs the record row, and it holds — status goes to the spine, type to the thumb, the width to the title. The card is the tier built to carry more, and its chips are footer metadata, never status or type (those still have their slots). Nothing in the row canon is relaxed by this tier existing.

### Hard rules

- **A FACT PROMOTED TO THE SIGNAL LEAVES THE FACTS.** The signal is the emphasised version of a fact, never a second copy. The list-chrome lab rendered Crew's `COMPLIANCE` twice on its first run — as the bar and as a cell — and caught Finances (`Amount`) and Quests (`Completed`) the same way. The primitive cannot detect it; every per-module adapter must be checked for it.
- **One signal.** If a record seems to want two, one of them is a fact.
- **Count facts against production before choosing them.** Half the candidate facts carry one value across every row, and a fact that never varies is noise with a label.
- **Card and row share their adapter.** The card is the row's narrow-width and detailed rendering, not a second model of the record: sub-meta and anchor become labelled facts. One declaration, two renderings.

### Open decisions

- How many facts a surface may declare (0–3 is what the atom renders; whether 3 is the norm or the ceiling is undecided).
- Whether `signal` is required on the detailed tier or may be `none`.

## Table sibling — `ColumnGrid` · `ColumnHeader` · `ColumnRow`

The archetype this contract never had. Catalog (`.cl-row`), Crew and Finances (`DataList`'s `.dl-row`) are all **56px grids you scan and sort by column**. They did not choose 56 over 64 for a record row; they are a different object that found only a record-row contract and each invented one. Their convergence on 56 is evidence for this archetype, not against the row's 64.

```
            NAME                              RECEIVED ↓   CODE          STATUS
▎ [thumb]  Susie Lawless                     Sep 22       RQ-804-I09   UNREAD    ›
▎          Black & grey shading
└─ lead: the one flexing column ─┘           └── data columns, max-content ──┘ anchor
```

- **One grid, every row `subgrid`.** A track is as wide as the widest thing in its column — label or value, header or any row — so a header cell cannot sit anywhere but over its cells. Verified at **0px drift** across four differently-shaped surfaces (4, 3, 5 and 3 columns; centred pills, end-aligned currency, dot meters, labels wider than their values), and after a reorder and a resize.
- **Height 56.** Row height is not a control height and is not a token.
- **Columns are data.** `ColumnGrid` takes `ColumnDef[]` in display order; `ColumnRow` takes its cells as a record keyed by column id and lays them out in that order. One ordering is read by the header and every row, which is the only way a reorder can be correct.
- **The engine is `useListColumns` (v0.73.0) — one for every header in the system.** It owns order, widths and sort per list and persists all three (localStorage, one key per surface), so nothing resets on reload or sign-in. `useColumnDrag` owns the gestures. Before it, cmngrdn had four engines (DataList, CatalogList, Inquiries' width-only one, Appointments' none) and sort lived in the URL or component state — so it reset. The header click and the bar's Sort control read and write the SAME `sort`, so either moves the other live.
- **The lead column is the flexible track.** A LEFT-edge grip only follows the cursor if the slack comes from the left; with a trailing `1fr` spacer (DataList's old shape) widening a column pushed its right edge out while the grip moved the other way.
- **Sort, reorder, resize — the history.** Click a label to sort (the SAME state the bar's sort control reads — two doors, never two sort models). Drag a label, or Alt+←/→, to reorder. Drag the grip on a column's LEFT edge to resize that column (Feather, 2026-07-08; skipped on the first data column). The atom emits `onSort` / `onMove` / `onResize` and holds nothing past a gesture: order, widths and persistence belong to the ONE column engine cmngrdn is to merge from `DataList` and `CatalogList`. Never a third.
- **Narrow reflows, never hides.** Below 620px of its own width (container query) the header goes and each row lays its cells out under the lead as labelled pairs — the column label travels with the value.

⚠️ **Two things the engine merge must settle, found building this:**
1. `DataList`'s resize grip is on the RIGHT edge (added 2026-07-26), against the LEFT-edge decision `CatalogList` and cmngrdn `docs/hq-table-columns.md` record. `ColumnHeader` follows the documented decision.
2. `DataList`, `CatalogList` and the lab all reorder by inserting BEFORE the drop target, which makes a one-step rightward move a no-op. `moveColumnTo` (exported beside the header) puts the column in the target's place instead; the merged engine should adopt it.

⚠️ **A virtualized list cannot use it yet.** `VirtualList` positions each row in its own box, so rows are not direct children of the grid and `subgrid` has nothing to adopt. cmngrdn's Inquiries (virtualized, 662 rows) keeps its own fixed-width grid at the table height for this reason — and it carries a THIRD column engine (resize persisted to `cg-hq-inquiries-colw`), so the merge is three engines, not two. The merged engine needs a fixed-track mode where every column has a width and each row applies `--cg-column-template` directly.

⚠️ **The gap lives on the grid, not the rows.** A subgrid with its own gap takes the difference out of its items as margin: with the gap on the rows, a column resized to 155px drew at 139 and every resize began with a 16px jump. Measured, then fixed in `ColumnHeader.css`.

## The row header — one row, directly above the rows (v0.72.0)

Every list has exactly one row between the tools bar and its rows, at the
bar's height (chip + 4px each side = 36px):

```
[☐]  124 inquiries                                         [Export] [Import]
[☑]  3 selected  [Set status ▾] [Add tag ▾] [Delete]  Clear          [Export]
```

- **Record lists** render `ListHeader`. **Tables** carry the same jobs on their
  column header row (`ColumnHeader`'s `select` · `count` · `bulk` · `actions`),
  because a table already spends a row on labels.
- **Selecting rows never adds a row.** The count becomes "N selected" and the
  bulk actions appear in place — for a table, over the column labels, which
  stay laid out (visibility, not display) so no track moves.
- **One checkbox.** `ListCheckbox` is the header's select-all and every row's
  checkbox. Before this, Inquiries, Audience and the DataList engine drew three.
- **The count lives here**, not in the bar.

Found on the first walkthrough of v0.71.0: Inquiries' bulk bar was a bordered
~40px card mounted inside the scroller (it scrolled away) with Export inside
it; Audience's was a different bar with Export up in the filter strip; the
DataList engine drew a third above its header. Same job, three shapes.

## Compliance gap — measured 2026-09-22

Measured live in cmngrdn at 1440×900 (cmngrdn `docs/list-chrome-standard.md` §1, §9):

| | Surfaces |
|---|---|
| Follow the record-row contract (`UniversalListRow`, 64/72) | **~16** |
| Went bespoke | **6** — Inquiries `.inq-row` (40) · Appointments `.appointments-row` (43, derived) · Catalog `.cl-row` (56) · Crew `.dl-row` (56) · Finances (56) · Quests (inline-styled, 104–237 variable) |
| Use the detailed tier (`UniversalCard`) | **1** (Transmissions) |

The bespoke six are not defiance: they needed a table or a detailed row, and this contract only described a record row. Catalog, Crew and Finances belong on the **table sibling**; Inquiries, Appointments and Quests are the open cases. The Inquiries `EXEMPT` below is an exemption, not an archetype — it is to be replaced by one of the four, not extended. **Deadline:** the list-chrome sweep, Phases 4–5 in cmngrdn.


## Props specification

### `UniversalListRow`

```ts
type UniversalListRowProps = {
  // Spine
  spineToken: keyof typeof CG_STATUS_TOKENS | "transparent"
  spineTooltip?: string  // hover label (e.g. "Live", "Pre-release")

  // Body — thumb
  thumb:
    | { kind: "image"; url: string; alt: string }
    | { kind: "icon"; icon: PhosphorIcon; tint?: string }
    | { kind: "mark"; char: string; tint?: string }      // for Transmissions etc.
    | { kind: "swatch"; color: string }                   // for Tags

  // Body — thumb corner badges (desktop-only, hidden ≤767px)
  thumbCornerTypeIcon?: PhosphorIcon
  thumbCornerPortalDot?: boolean

  // Body — text
  name: string
  subMeta?: ReactNode

  // Right anchor
  rightAnchor:
    | { kind: "progress"; value: number; total: number }  // 0-5 dots typically
    | { kind: "time"; iso: string; relative?: boolean }
    | { kind: "none" }

  // Right anchor — action buttons (always rendered, disabled when href absent)
  primaryAction?: { icon: PhosphorIcon; href?: string; onClick?: () => void; label: string }
  secondaryAction?: { icon: PhosphorIcon; href?: string; onClick?: () => void; label: string }

  // Optional selection slot — renders AFTER the spine and BEFORE the thumb
  // so the spine stays at the visible row left edge even when the row
  // carries a bulk-action checkbox. Audience is the canonical consumer.
  selectionSlot?: ReactNode

  // Behavior
  onClick?: () => void  // row body click — typically opens inspector
  href?: string         // OR navigate (mutex with onClick)
  selected?: boolean    // optional selected state
}
```

Notes:
- `subMeta` is `ReactNode` so consumers can compose multi-element sub-meta (e.g. comma-separated tag pills for Transmissions). Keep it single-line + truncating — anything taller breaks the row-height contract.
- Action buttons render with `disabled` styling when `href` and `onClick` are both absent. This locks the right edge optically — every row in the list has the same column positions even when some rows don't have a copy/open target yet.
- On mobile (≤767px), `primaryAction` + `secondaryAction` collapse into a single `⋯` `IconButton` that opens a sheet with both options.

### `UniversalTile`

```ts
type UniversalTileProps = {
  spineToken: keyof typeof CG_STATUS_TOKENS | "transparent"
  thumb: UniversalListRowProps["thumb"]
  thumbCornerPortalDot?: boolean
  name: string
  subMeta?: ReactNode  // Same content as the list-row sub-meta — grid + list share field-mapping
  bottomSlot:
    | { kind: "progress"; value: number; total: number }
    | { kind: "edition"; serial: string; cap?: string }
    | { kind: "custom"; node: ReactNode }
  onClick?: () => void
  href?: string
  selected?: boolean
}
```

## Status-spine token map

Spine colors map per-module status to existing `--cg-status-*` tokens. No new tokens needed at the cgos-ui layer — consumers maintain their own per-module mapping in a `types/status.ts` file (already an established cgos-ui convention).

| Module status | Token |
|---|---|
| Library `live`, Portal `Live`, Transmission `sent`, Appointment `confirmed`, Mission `active`, Task `done`, Offering `available` | `--cg-status-success` (green) |
| Library `production`, Portal `Pre-release`, Transmission `sending`, Appointment `tentative`, Task `running` | `--cg-status-warning` / `--cg-status-amber` |
| Library `conceptualization` | `--cg-status-purple` |
| Library `archived`, Portal `Draft`, Transmission `draft`, Mission `inactive`, Task `pending`, default empty | `--cg-status-neutral` / `--cg-status-archived` |
| Transmission `scheduled` | `--cg-status-blue` |
| Transmission `failed`, Appointment `cancelled`, Task `failed` | `--cg-status-danger` |
| SMS `unread` | `--cg-accent` (treat as state highlight, not status) |
| Member `owner` | `--cg-status-purple` |
| Member `admin` | `--cg-status-blue` |
| Member `editor` | `--cg-status-cyan` |
| Member `viewer` | `--cg-status-neutral` |

Tooltip on spine hover surfaces the human-readable label (e.g. `"Pre-release"`).

## Per-module field-mapping matrix

| Module | Variant | Spine source | Thumb | Sub-meta | Right anchor | Actions |
|---|---|---|---|---|---|---|
| Library / Projects | progress | Airtable `Status` | cover art OR Phosphor `Disc` | attached-asset count | progress dots | Copy URL, Open `/library/projects/{slug}` |
| Library / Assets | progress | Airtable `Status` | cover art OR Phosphor type icon (`MusicNote` / `Play` / `Microphone` / `Image`) | parent project name | progress dots | Copy URL, Open `/library/assets/{slug}` |
| Library / Portal Pages | progress | portal status (Live / Pre-release / Draft) | cover art OR Phosphor `Globe` | `/slug` | progress dots (scoring TBD) | Copy URL, Open `/{artist}/portal/{slug}` |
| Library / Documents | progress | doc status (TBD) | Phosphor `FileText` | TBD | progress dots (scoring TBD) | Copy URL, Open |
| Comms / Transmissions | progress (draft/scheduled) / time (sent) | transmission status | typographic mark — `M` for email, `ChatCircle` for SMS | audience segment tags, comma-separated | progress when draft/sending, time when sent | Open, Resend |
| Comms / Audience | none | subscription state (TBD) | contact avatar | email + phone | level (5 dots = level tier) | none |
| Pulse / Tags (`/hq/analytics/tags`) | none | tag color | Phosphor `Tag` color swatch | contact count | none | none |
| Comms / SMS Inbox | time | unread/read | contact avatar | message preview | last-message time | unread pip |
| Work / Appointments | time | tentative/confirmed/cancelled | contact avatar OR appt type icon | appt type | start time | Reschedule, Cancel |
| Work / Inquiries | EXEMPT | spine only | — | — | — | — |
| Journey / Missions | progress | active/inactive | Phosphor mission icon | trigger metric + goal | progress (fan completion rate) | Edit, Duplicate |
| Scanner / Sessions | time | open/closed | Phosphor mode icon | mode + parent entity | scan count | View |
| Workspace / Members | none | role color | avatar | role + last active | none | Edit role, Remove |
| Admin / Workspaces | none | workspace status | workspace sigil | slug + owner email + tier | none | Edit |
| Admin / Tasks | time | task status | Phosphor task type icon | created at | created at | View |
| Activity / Dashboard feed | time | event-type tint | source workspace sigil | event copy | timestamp | "Open context →" |
| Chat / Awen sessions | time | recency | Awen sigil | last message preview | last-activity time | Continue |
| Offerings / Products | progress | active/inactive | cover image | price | progress (setup completeness, TBD) | Copy link, Edit |
| Offerings / Events | time | upcoming/past | cover image | date + venue | start time | RSVP count |
| Offerings / Tickets | progress | available/sold-out | tier badge | event link | progress (stock vs sold) | Edit |
| Offerings / Orders | time | order status | customer avatar | customer + product | order time | View |

**Vault Passes + Vault Collectibles are exempt from this contract.** Both are horizontal-scroll lanes with custom tiles (PassCard, collectible tile). The tile bottom-slot rule still applies to collectibles (edition number) so the visual rhythm reads consistently.

## Hard rules

- **Never put a status chip, type chip, or category chip inside a list row body.** Both signals leave the chip layer — status to the spine, type to the thumbnail.
- **Never render a date in a fourth column.** Time-anchored lists put the timestamp in the right anchor slot. Progress-anchored lists drop the date entirely (it lives in the inspector).
- **Action buttons render even when disabled.** The right edge must stay optically locked across every row in a list. Don't conditionally drop the button — render it greyed.
- **Sub-meta is single-line.** If the content wants two lines, you're overloading the slot. Move secondary detail to the inspector.
- **Row height matches the contract (64 desktop / 72 mobile).** Don't pick a one-off height. If a module wants more density, the answer is shorter sub-meta, not a shorter row.
- **Use `UniversalListRow` / `UniversalCard` / `UniversalTile` (or the table sibling) directly.** Never re-roll the skeleton in module CSS. Per-module variation lives in the props (sub-meta content, thumb kind, status token), not in the rendered structure.
- **Inquiries is the only exempt list.** New exemptions need a documented reason in this file before they ship.

## Migration order (consumer responsibility)

Sweep order suggested for cmngrdn (one PR per module, validated visually before moving to the next):

1. Library / Projects — cleanest data shape, validates the contract
2. Library / Assets + Portal Pages (same chassis)
3. Comms / Transmissions — exercises the dual-variant rule (progress vs time)
4. Comms / Audience + Tags — validates the `none` variant
5. Work / Appointments — validates the `time` variant
6. Activity + Dashboard preview — validates timestamp + sigil thumb
7. Remaining modules (Scanner, Missions, Members, Admin)

After each sweep, audit on iPhone PWA + desktop at multiple widths before locking the next module.

## Open questions

These need decisions before the matching props can resolve to real data:

- **Portal Pages progress scoring.** Likely: `has hero + has links + has capture + has cover art + has unlock rule` = 5 dots. Confirm rule set.
- **Transmissions in `sent` state — engagement metric in right anchor?** Or just timestamp + click to open analytics? Decide before sweeping the module.
- **Documents progress scoring.** When the surface ships.
- **Subscription-state spine for Audience.** Subscribed/unsubscribed/pending — what's the canonical state set?
