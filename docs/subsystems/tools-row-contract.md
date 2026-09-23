# Tools row contract — the bar above a list

The contract for the strip between a module's tabs and its first row: sort, filter, search, view, create. Atoms landed in **v0.71.0**: `ToolsRow`, `ChipSplit`, `Shelf` (+ `ShelfToggle`, `ShelfGroup`), `ChipApplied` (+ `ChipAppliedClear`), with `Input` / `Select` / `Button` `size="chip"`.

Nothing governed this strip before, which is why cmngrdn grew four implementations of it at six heights. The rows beneath it are governed by [`../list-row-template.md`](../list-row-template.md). The design reasoning and the live measurements are in cmngrdn [`docs/list-chrome-standard.md`](https://github.com/cmngrdn/cmngrdn/blob/main/docs/list-chrome-standard.md); the working model is cmngrdn `/lab/list-chrome`.

## v0.72.0 — the assembly is the standard, not the parts

v0.71.0 shipped the parts and let each surface compose them. Within one sweep
that produced four Filter buttons without the funnel, lists with no sort or no
search, a stat-chip row left outside the bar, and a create button that said
"New quest" on one page and "+" on the next — every one visible to Feather on
the first click-through. **Parts are not a standard; the assembly is.** So:

- **`ListToolbar` is the bar.** A surface declares `sort` · `filters` · `pulse`
  · `search` · `view` · `create` (· `extra` for a control the bar cannot model)
  and the atom decides order, controls and shelves. Do not compose `ToolsRow`
  by hand for a list.
- **`FilterToggle` / `PulseToggle`** are the only Filter and Pulse controls —
  fixed word, fixed glyph. **Pulse sits on the right, beside the view toggle**
  (both change how you see the list, not what is in it).
- **The Filter drawer is open exactly while a filter is on** (2026-09-23). It
  replaced the applied-filter chips beside search — the drawer already names
  every active value, and a second readout of the same fact cost the bar its
  width. With nothing on, Filter opens it to pick the first one; "Clear all"
  lives in the drawer and closes it. So what is narrowing a list is always in
  view without an extra row of chips.
- **Create is a square "+"** (icon-only `Button`; `label` is the tooltip and
  accessible name). Register the phone's create another way.
- **Stat lenses are Pulse.** A row of counted `StatChip`s — focus lenses,
  status counts, "Unread 4" — is the module's numbers; it renders inside the
  Pulse shelf and the shut control carries the headline one. Nothing sits
  between the bar and the rows except the row header.
- **The count, select-all, bulk actions and list actions (Export, Import) are
  NOT in the bar.** They are about the rows: `ListHeader`, or the table's
  column header row. See [`../list-row-template.md`](../list-row-template.md)
  § The row header.

## Why

Measured in cmngrdn on 2026-09-22 at 1440×900:

- **Six strip heights** — 41 · 45 · 49 · 56.6 · 89, and Quests with none.
- **Three search heights** beside 28px chips — 28, 32, 43.6. The 43.6 comes from cmngrdn's unscoped global `input[type="text"] { font-size: max(16px,1rem) }`, which beats `.weave-input` on specificity. A consumer problem, fixed there (Phase 0), not here.
- **No shared token.** `ControlChip` hardcoded 28; the control scale was 24/32/40/48. cmngrdn patched `Button` down to 28 by hand.
- **28% of the module** above the first row on Inquiries — a stack of always-on strips.

## The shape — one row, N shelves

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Date ⌄|↓] [⚲ Filter 2] [Pulse 1,804]  search…  Unread× Form×  124 [▤▦] [New] │  36px
├──────────────────────────────────────────────────────────────────────────┤
│  STATUS  New 7  Replied 14   FORM  Tattoo 112           ← a shelf        │
└──────────────────────────────────────────────────────────────────────────┘
```

| Slot | Holds | Rule |
|---|---|---|
| `left` | sort `ChipSplit`, Filter + Pulse `ShelfToggle`s | changes what you are LOOKING AT |
| `search` | `<Input size="chip" type="search">` | a ceiling (280) AND a floor (200) |
| `applied` | `ChipApplied` × n, `ChipAppliedClear` when ≥2 | absent when nothing filters |
| `count` | the number shown | mono, muted |
| `right` | view toggle (`ChipGroup` + `ChipSegment`) | |
| `create` | `<Button size="chip">` | changes what EXISTS; hidden at narrow |
| children | `<Shelf>`s | |

**Order is `filters · search · actions`.** Search is the one elastic member and sits between two intrinsically-sized groups. `search · filters · actions` is on the lab deck as an open question, but only this order ships.

## Shelves

| Shelf | Opened by | Holds | Variant |
|---|---|---|---|
| Sort | the value half of `ChipSplit` | the sort field list | `row` |
| Filter | `FilterToggle badge={n}` | every dimension as a dropdown chip (`Status ▾ Form ▾ Blast ▾`); a FIXED vocabulary of ≤ 4 options may opt into toggles (`display: "toggles"`) | `row` |
| Pulse | `ShelfToggle readout={…}` | the analytics grid | `panel` |
| Selection | **nothing**; it opens when rows are selected | bulk actions | `row`, `tone="selection"` |

- **DROPDOWN BY DEFAULT; TOGGLES BY OPT-IN.** The deciding factor is where a
  dimension's options come from, not how many there are today. A fixed
  vocabulary (status, state, kind — defined in code) of at most 4 short options
  may render as toggle chips. Anything drawn from records (blasts, tags, forms,
  calendars, artists) is always a dropdown: it grows, and its labels are
  whatever someone typed. The first cut decided by count (≤ 8 → toggles), so
  the same filter was chips in one workspace and a dropdown in the next, and
  SMS Blasts' long campaign names took a whole shelf row.
- **A SHUT SHELF MUST STILL SAY SOMETHING.** `ShelfToggle`'s type requires `badge` or `readout`. Folding a thing away without leaving a number is a regression.
- **The open drawer is what makes the fold safe.** The badge says how many; the drawer, open whenever anything filters, says which. (Superseded: an applied-chip readout beside search, removed 2026-09-23.)
- **One shelf at a time**, except Selection, which is orthogonal. Shelves close on surface change; shelf state is per surface.
- **Sort is one shell, two halves.** The value half opens the field list and the modifier half flips direction. The frequent action is one click; the rare one is behind the caret.

## Geometry

| Value | Source | Note |
|---|---|---|
| control | `--cg-control-h-chip` **28** | every control reads it |
| bar | `calc(control + 4px × 2)` **36** | derived, never typed |
| gutter | `--cg-gutter` **24** / `--cg-gutter-narrow` **12** | shared with the tab bar and the rows |
| divider | `--cg-hairline` | chrome, so `--cg-glass-border` |

Verified at the runtime (`getBoundingClientRect` + `getComputedStyle`) in a composed bar holding every atom that belongs there, including `Select size="chip"`, `ChipSelect` and a counted `ChipToggle`: **all 12 controls measure 28px, and the bar measures 36px.**

## Narrow — a container query, not a media query

Below **620px of the row's own width** (`container: cg-tools-row`), row 1 is `left` and row 2 is search with the view toggle beside it. `count`, `applied` and `create` hide, and shelves scroll sideways instead of wrapping. The container is the right trigger because a list sits in splits, rails and inspectors, not only in the window.

- ⚠️ **A surface that hides `create` at narrow MUST offer create another way on a phone** (cmngrdn: `usePageAction`), or it has none. Catalog shipped that way once.
- iOS focus-zoom is handled by `Input`'s own `(pointer: coarse)` → 16px rule, which is the precise signal. Width is not the signal, so the lab's "16px/32px at narrow" is deliberately not reproduced: the search stays one chip tall.

## Hard rules

1. **One control height per bar, read from `--cg-control-h-chip`.** If something in the bar measures other than 28, it has picked the wrong size. Fix the size; don't override the height.
2. **The bar's height is derived.** Never set it.
3. **Never `!important` against these atoms from a consumer.** If one cannot be themed, that is this repo's bug.
4. **A shut shelf carries a readout.**
5. **`@container`, never `@media`, for anything inside the list.**
6. **`--cg-control-h-xs` is 24 and stays 24.** The chip is its own step.

## Not here

- The column header lives with the rows, not the bar: `ColumnHeader` → [`../list-row-template.md`](../list-row-template.md) § Table sibling.
- Per-module choices — which sort fields, which filter dimensions, which Pulse numbers — are consumer configuration.
