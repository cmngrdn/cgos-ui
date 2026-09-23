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

## Table sibling — THE table primitive (v0.74.0)

`cgos-ui/ui/ColumnHeader` → `ColumnGrid` · `ColumnHeader` · `ColumnRow` · `ColumnRows` · `ColumnGroupRow` · `ColumnEditCell` · `columnsFrom`
`cgos-ui/ui/ColumnCard` → `ColumnCards` · `ColumnCard` (the same records as cards)
`cgos-ui/ui/useListColumns` → `useListColumns` (the state) · `useColumnDrag` (the gestures)

**Every column list in the system renders through this — one renderer, one set of header behaviours.** Until v0.74.0 four renderers drew tables and shared only the engine: cmngrdn's `DataList` (Crew, Rates, Pay periods, pay-period Names), `CatalogList` (Catalog), `InquiriesList` (virtualized) and this atom (Appointments, Workspaces). Every header fix cost four edits and they drifted anyway. A surface that needs something the primitive cannot do gets it added HERE; it never grows a fifth renderer.

```
[☐ ▸ ▣]  CLIENT        RECEIVED ↓   CODE ⏷      STATUS                       [Export]   ← ColumnHeader
▎☐ ▸ ▣   Susie Lawless  Sep 22       RQ-804-I09  UNREAD                          ⧉ ↗    ← ColumnRow
 └prefix┘ └─────────────── fixed columns ───────────────┘ └─ filler 1fr ─┘ └anchor┘
```

### The tracks — the spreadsheet model

`[prefix]? [column]… [filler minmax(0,1fr)] [anchor]?`

- **prefix** — checkbox (22) · nesting rail (18) · art square (`artWidth`), 10px apart. Present when the grid has `select`, `nest` or `artWidth`. Not resizable, not reorderable.
- **No pinned column.** The name is an ordinary column: it sorts, drags and resizes like any other, and any column can be dragged to the first spot. An earlier cut had an optional pinned "lead" that could be neither dragged nor dropped in front of; Catalog and Crew had turned it off and Inquiries had not, so the SAME primitive let you move a column first on one list and not the next (Feather, 2026-09-23). It was removed rather than defaulted off — one behaviour, no opt-out. (`LEAD_COLUMN_ID` survives only as the old width key, read once to carry a saved width over.)
- **columns** — `ColumnDef[]` in display order, EVERY one a fixed width (`columnsFrom(defs, engine)` applies the saved order and widths; a column with neither gets `defaultWidth`, else 120px — never `max-content`).
- **filler** — the only flexing track. Leftover width lives here, after the last column.
- **anchor** — row actions, `anchorWidth` px. List actions in the header need no anchor: they sit at the header's right end.

**Resize (Feather, 2026-09-23 — Google Sheets / Airtable).** The grip is on each column's RIGHT border, every column including the name; dragging right widens THAT column and nothing else changes size. When the columns outgrow the view the rows are wider than the grid and the scroll container scrolls sideways; the header is in the same scroller, so it follows with no script.

**No subgrid.** v0.71.0 made rows `subgrid` children so a track could be as wide as its widest label or value. With every track a fixed width that bought nothing, and it is what made virtualization impossible (a virtualized row is not a child of the grid). Each row now applies `--cg-column-template` itself, so a row mounted alone draws on the header's tracks exactly.

### Header behaviours — non-negotiable, every table

1. **Click a label → sort; again → flip.** The header and the bar's Sort control are ONE state — `useListColumns().sort` — so each moves the other live. Wire the header's `onSort` to `toggleSort`, and the bar through the same engine (cmngrdn: `toolbarSortFor`).
2. **Drag a label → reorder**, header and rows together (pointer events; ≥4px of movement, so a press is still a click; Alt+←/→ by keyboard).
3. **Resize** as above.
4. **Order, widths and sort persist** across reloads and sign-in — the engine's localStorage key, one per surface.
5. **The result count lives ONLY in the tools bar.** Never in a header row: in the leading tracks it overlapped the first label, beside it it widened the column. `ColumnHeader`'s old `count` prop is ignored.
6. **One header row** does select-all (prefix), "N selected" + bulk actions + Clear IN PLACE over the labels (which stay laid out — visibility, not display — so no track moves), and list actions (Export) at the right end.
7. **Per-column filter funnels** — `ColumnDef.filter` puts a funnel after the label; the menu is portalled and placed by `placeMenuFor` (a menu inside a sticky header was clipped by any scrolling ancestor).

### Rows

`ColumnRow` — 56px (`--cg-column-row-h`). `cells` (keyed by column id, laid out in the grid's order — the only way a reorder is correct), `anchor` (clicks never open the row), `art`, `spine`, `title` (spine tooltip), `onClick`, `onContextMenu`, and three distinct states that stack: **`selected`** = the record open in the inspector (`aria-current`, elevated fill) · **`checked`** + `onCheck` = ticked for bulk (`aria-selected`, accent tint; `onCheck` gets the event for shift-ranges) · **`focused`** = the keyboard cursor (an accent rule, not another fill). `nest` = `{ expanded, onToggle }` on a parent (chevron) or `"child"` (guide line). `id`/`rowRef`/`tabIndex` for a list shell that owns the keys (`aria-activedescendant`).

`ColumnGroupRow` — a full-width label between rows ("Loose assets", "Today — Sep 23"); collapsible with `onToggle`.

`ColumnEditCell` — the value is its own dropdown (Airtable's model). At rest it looks exactly as the plain cell; a caret on hover; the menu is portalled. Put it in `cells`.

`ColumnRows` — the **virtualized** body: `count`, `rowHeight` (56), `renderRow(i)`, `scrollToIndex` (the keyboard cursor — minimum-distance scroll that clears the sticky header). It does not scroll itself: the grid's nearest scrolling ancestor does (the same one that scrolls sideways and that the header sticks to), and it measures its own offset in that scroller. Below the narrow breakpoint rows are variable-height, so every row mounts there.

### Cards

`ColumnCards` (`select` · `nest` · `art`) + `ColumnCard` — the same records as full-width cards: `title` · `hero` · `meta` · `facts` · `strip` · `actions` · `needs` / `ready` · `synopsis`, with the row's furniture (spine, checkbox, rail, art 68px) kept, so switching view keeps selection, tree and covers. Cards have no labels, so select-all / bulk / list actions ride `ListHeader` above them.

### Narrow — reflow, never hide

Below **620px of the grid's own width** (container query `cg-columns`) the labels go; the header keeps only what it does besides labelling (select-all, bulk, list actions). The first column is the title line; the rest lay out under it as a two-up grid of labelled pairs — the label travels with the value. The anchor rides the first line's right edge.

### Wiring a surface

```tsx
const cols = useListColumns({ storageKey: "cg-hq-crew", columns: SPECS, defaultSort });
const columns = columnsFrom(DEFS, cols); // saved order + widths

<ColumnGrid columns={columns} select nest artWidth={40} anchorWidth={60} label="Crew">
  <ColumnHeader sort={cols.sort} onSort={cols.toggleSort} onMove={cols.move}
    onResize={cols.setWidth} select={…} selectedCount={n} bulk={…} onClearSelection={…} actions={<Export/>} />
  {rows.map((r) => <ColumnRow key={r.id} cells={…} … />)}   // or <ColumnRows count renderRow />
</ColumnGrid>
```

The grid must sit inside ONE scroll container that scrolls both axes (cmngrdn: `.hq-scroll`), with nothing between them that clips (`overflow: hidden`) — or the sticky header and the sideways scroll break.

### Measured history (keep)

- **The gap lives on the rows now, and that is correct.** Under subgrid a gap on the rows was taken out of the cells as margin (a 155px column drew at 139). Rows are ordinary grids now; the gap is theirs.
- **A flag that swallows "the click after a drag" must expire** (zero-delay reset) — with pointer capture the click lands on the cell, and a standing flag ate the NEXT real sort click.
- **Reorder puts the column in the target's place** (`moveColumnId`), so a one-step rightward move is a swap, not a no-op.

## The row header — one row, directly above the rows (v0.72.0)

Every list has exactly one row between the tools bar and its rows, at the
bar's height (chip + 4px each side = 36px):

```
[☐]                                                          [Export] [Import]
[☑]  3 selected  [Set status ▾] [Add tag ▾] [Delete]  Clear          [Export]
```

- **Record lists** render `ListHeader`. **Tables** carry the same jobs on their
  column header row (`ColumnHeader`'s `select` · `bulk` · `actions`),
  because a table already spends a row on labels.
- **Selecting rows never adds a row.** The count becomes "N selected" and the
  bulk actions appear in place — for a table, over the column labels, which
  stay laid out (visibility, not display) so no track moves.
- **One checkbox.** `ListCheckbox` is the header's select-all and every row's
  checkbox. Before this, Inquiries, Audience and the DataList engine drew three.
- **The count does NOT live here** (reversed 2026-09-23): it lives only in the
  tools bar (`ListToolbar` `count`). In a header row it overlapped or widened
  the first column, and a row that exists only to show a count is a row the
  list does not need.

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
