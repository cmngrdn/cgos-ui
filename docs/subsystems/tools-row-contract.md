# Tools row contract — the bar above a list

The contract for the strip between a module's tabs and its first row: sort, filter, search, view, create. Atoms landed in **v0.71.0**: `ToolsRow`, `ChipSplit`, `Shelf` (+ `ShelfToggle`, `ShelfGroup`), `ChipApplied` (+ `ChipAppliedClear`), with `Input` / `Select` / `Button` `size="chip"`.

Nothing governed this strip before, which is why cmngrdn grew four implementations of it at six heights. The rows beneath it are governed by [`../list-row-template.md`](../list-row-template.md). The design reasoning and the live measurements are in cmngrdn [`docs/list-chrome-standard.md`](https://github.com/cmngrdn/cmngrdn/blob/main/docs/list-chrome-standard.md); the working model is cmngrdn `/lab/list-chrome`.

## 2026-09-28 — four drawers, one row, nothing moves unless you tapped it

Measured on the SMS inbox at 375px: the list tools took **171px** — sort and
filter, a full-width search row, count + Pulse + view, then the Filter drawer
open on every visit because the inbox has a DEFAULT filter ("Wrote back") and
the drawer opened whenever a filter was on. After: **one 36px row**, first
conversation at 85px instead of 219px. Every list takes the same bar, so every
list got the same row back.

- **Search is a drawer.** The bar carries a square glyph (`SearchToggle`),
  accent-coloured at rest so it is easy to find and FILLED while a query is
  applied. The field is the Search drawer — full width on a phone, capped at
  400px on a wide screen (a 1,100px field for a five-letter query was the old
  problem moved). Opening it puts the cursor in the field; `/` opens it from
  anywhere that is not a text field; Esc folds it and keeps the query.
- **One drawer at a time — Sort, Filter, Search, Pulse — and a shut drawer
  keeps working.** Closing never undoes what was set; it folds into the
  control: the sort field on the split, `Filter 2` on the badge, the filled
  search glyph. So there is never more than one drawer open and never any
  doubt what is narrowing the list.
- **Nothing opens on its own, and nothing grows sideways.** The Filter drawer
  no longer opens because a filter is on (that was 2026-09-23; on a list with a
  default filter it meant a drawer open on every visit). No control in the bar
  changes width as you use it; the only movement is a drawer you tapped
  sliding the list down beneath it.
- **The count leaves the bar.** A total is the module's numbers, so it heads
  the Pulse drawer; "how many matched?" is answered at the end of the Search
  drawer (while a query is on) and the Filter drawer.
- **Narrow: one row, and the controls never give way.** The Filter and Pulse
  WORDS fold (glyph + badge / glyph + readout remain), and a long Pulse readout
  ellipsises (`314 blocki…`) — measured on the crew roster, where it had pushed
  Filter and Search off the side of the bar. A narrow Filter drawer wraps onto
  a second line; the "scroll sideways" rule that claimed otherwise never
  applied (see ToolsRow.css).

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
- ~~**The Filter drawer is open exactly while a filter is on** (2026-09-23).~~
  **Superseded 2026-09-28:** the drawer opens only when tapped; the badge
  carries the count. See the section above.
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
│ [🔍] [⚲ Filter 2] [Date ⌄|↓]                    [Pulse 1,804] [▤▦] [+]   │  36px
├──────────────────────────────────────────────────────────────────────────┤
│  STATUS  New 7  Replied 14   FORM  Tattoo 112           ← a shelf        │
└──────────────────────────────────────────────────────────────────────────┘
```

| Slot | Holds | Rule |
|---|---|---|
| `left` | sort `ChipSplit`, Filter + Pulse `ShelfToggle`s | changes what you are LOOKING AT |
| `search` | unused by `ListToolbar` since 2026-09-28 (search is a drawer) | a ceiling (280) AND a floor (200) if a caller still passes one |
| `applied` | `ChipApplied` × n, `ChipAppliedClear` when ≥2 | absent when nothing filters |
| `count` | the number shown | mono, muted |
| `right` | view toggle (`ChipGroup` + `ChipSegment`) | |
| `create` | `<Button size="chip">` | changes what EXISTS; hidden at narrow |
| children | `<Shelf>`s | |

**Order is `Search · Filter · Sort ····· Pulse · View · +`** (2026-09-28). The left group is what is IN the list and in what order, narrowest first: Search finds one thing, Filter narrows to a group, Sort orders what is left. The right group is how you SEE it, then create. Search leads partly because the phone's global "search anything" glyph sits bottom-right, and a list search above it would read as the same control. Every search placeholder names what it searches ("Search conversations…"), never a bare "Search…". (Superseded: `filters · search · actions`, from when search was the one elastic box.)

## Shelves

| Shelf | Opened by | Holds | Variant |
|---|---|---|---|
| Sort | the value half of `ChipSplit` | the sort field list | `row` |
| Filter | `FilterToggle badge={n}` | every dimension as a dropdown chip (`Status ▾ Form ▾ Blast ▾`); a FIXED vocabulary of ≤ 4 options may opt into toggles (`display: "toggles"`) | `row` |
| Search | `SearchToggle` (square glyph; filled while a query is on) | the field (≤ 400px) + the match count | `row` |
| Pulse | `ShelfToggle readout={…}` | the list total, then the analytics grid | `panel` |
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
- **The control is what makes the fold safe.** The badge says how many filters; the filled glyph says a query is on; the drawer, one tap away, says which. (Superseded: an applied-chip readout beside search, removed 2026-09-23; the always-open Filter drawer, removed 2026-09-28.)
- **One shelf at a time — Search included** — except Selection, which is orthogonal. Shelves close on surface change; shelf state is per surface.
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

Below **620px of the row's own width** (`container: cg-tools-row`) the bar stays **one row** (2026-09-28; it was two while search was a box). The Filter and Pulse words fold, the Pulse readout ellipsises before any control gives way, `applied` and `create` hide, and a drawer of controls wraps. The container is the right trigger because a list sits in splits, rails and inspectors, not only in the window.

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
