# cgos-ui — Don't Change These Patterns

Institutional memory for the shared design package. Each entry exists because an alternative was tried
and failed, and each carries the **why**, so the next reader can tell a rule from a
preference.

**This is the default destination for what a session learns.** `CLAUDE.md` is read in
full at every session start; this file is read on demand. A record in the always-loaded
file charges every future session and buys none of them anything.

**Load this file** before any non-trivial change to a subsystem below. What stays in
`CLAUDE.md` is the blanket rules you would violate *before* thinking to open a doc.

Entry shape — three parts, in this order:

1. **The rule, in one bold sentence**, written as an instruction rather than a story.
2. **The why** — what was tried, what it cost, and how it was measured. A number beats
   an adjective.
3. **How to apply** — what a future session should actually do differently.

Created 2026-09-19 as part of the Q4 context-diet pass
([q4-audit-2026-09.md](https://github.com/cmngrdn/cgos/blob/main/docs/q4-audit-2026-09.md)).
Empty is the correct starting state — entries arrive as sessions learn things, via
`/closedown` step 1.

---

## List chrome (2026-09-22 → 23)

- **Ship the ASSEMBLY as the standard, not the parts.** v0.71.0 shipped `ToolsRow`, `ChipSplit`, `Shelf`, `ChipApplied` and let each cmngrdn surface compose them. Within one sweep: four Filter buttons without the funnel, lists with no sort or no search, stat rows left outside the bar, "New quest" beside "+" — every one caught on the owner's first click-through. `ListToolbar` (configuration: `sort` · `filters` · `pulse` · `search` · `view` · `create` · `count`) fixed it because a surface can no longer choose the arrangement.
  **How to apply:** when a standard is a *layout of* atoms, the layout is the atom. Ship it as a config-driven composite, not as parts plus a doc.

- **A header row is sized by what is in it — don't put a count or anything variable there.** "1,804 items" in the narrow leading tracks overlapped the first label; moved beside that label, it widened the column (tracks are max-content). The count now lives only in the bar's right group.
  **How to apply:** before adding text to a column header cell, ask whether it changes the column's width. Readouts belong in the bar.

- **Resize is the spreadsheet model — right border, one column, trailing filler.** A left-edge grip with the lead column absorbing the slack (the 2026-07-08 rule) felt wrong in use: a drag moved other columns and seemed to resize the opposite side. Owner: "work exactly like Airtable or Google Sheets." Every column fixed-width, one `minmax(0,1fr)` filler, grip on the right border including the lead. Measured: +64px on one column left the others' widths identical.
  **How to apply:** fixed widths also mean rows needn't be `subgrid` children to align — which is what makes a virtualized table possible on the same primitive.

- **A subgrid's own gap is taken out of its cells.** With `column-gap` on the subgrid rows and 0 on the grid, a column resized to 155px drew at 139 and every resize began with a 16px jump. Put the gap on the grid.

- **A flag that swallows "the click after a drag" must expire.** With pointer capture the click lands on the cell, not the label, so the flag stayed up and ate the NEXT real sort click. Reset it on a zero-delay timer.

- **Filters: dropdown by default; toggles only for a small FIXED vocabulary.** Deciding by option count (≤ 8 → chips) made one filter chips in one workspace and a dropdown in the next, and let long record-derived labels (SMS blasts) eat a shelf row. Where the options come FROM decides.

- **Four renderers sharing one engine still drift.** After unifying state + gestures (`useListColumns`/`useColumnDrag`), every header change still cost four edits (DataList, CatalogList, InquiriesList, ColumnGrid). The cause is history: each table was built for one page and the "hoist when a second consumer needs it" note was skipped exactly when the second consumer arrived. Merge the renderers.

<!-- Add entries above this line, newest last. -->
