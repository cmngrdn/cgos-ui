# List Row + Tile Template — Universal Contract

The visual contract for every list and grid surface across HQ (`cmngrdn` + `cgos` dashboard) and any future Common Garden product surface. Locks the row skeleton so the eye can predict layout the moment it lands on a new module.

This is a **contract doc**, not an implementation log. The matching atoms are `cgos-ui/ui/UniversalListRow` + `cgos-ui/ui/UniversalTile` (forthcoming).

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
- **Use `UniversalListRow` / `UniversalTile` directly.** Never re-roll the skeleton in module CSS. Per-module variation lives in the props (sub-meta content, thumb kind, status token), not in the rendered structure.
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
