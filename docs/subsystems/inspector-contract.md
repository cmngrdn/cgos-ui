# Inspector Contract — cross-repo authority

Moved out of `CLAUDE.md` on 2026-09-19 by the Q4 context-diet pass ([q4-audit-2026-09.md](https://github.com/cmngrdn/cgos/blob/main/docs/q4-audit-2026-09.md)).
It was 21,770 bytes of a 51KB file that is read **in full at every session start**, and it is only relevant when you are working on this subsystem.

**Nothing here was rewritten** — the text is verbatim, byte-for-byte, from the section it replaced. It is reached from the routing table in `CLAUDE.md`, and from a nested `CLAUDE.md` or a path-scoped rule where this repo's layout allows one.

---

## Inspector Contract — cross-repo authority

The chrome rules below are authoritative for every consumer building an inspector / drawer / sheet surface. The implementation lives in cmngrdn (`@/components/hq/inspector/*` + `src/contexts/InspectorContext.tsx`) and is the reference. Full implementation spec + per-surface migration playbook lives at `cmngrdn/docs/inspector-toggle-redesign.md`. This section captures the locked design contract — what every consumer MUST honor regardless of repo.

**Locked 2026-05-16, cross-repo authority assigned 2026-05-25 after cmngrdn Phase 5 complete.**

### Architectural model

- **Modules are system engines.** Each `/hq/*` module is its own application layered over the same data (Pulse, Journey, Dispatch, Library, Vault, Service, Scanner, etc.). Inspectors are NOT a separate module — they're the entity-window pattern that every module composes when an operator clicks into a row.
- **Inspectors are entity windows.** They hold ENTITY aspects (Details / Content / Preview / Variants / Activity / Thread / Linked / Settings). Drilldowns are the door between modules and inspectors.
- **Drilldowns push onto the inspector history stack** and land in the **canonical view** of that module/entity. No duplicated views — shared components only. The Contact inspector you reach by drilling from Inquiry IS the same Contact inspector you'd open from Audience.

### Chrome shape

```
┌──────────────────────────────────────────────────────────┐
│ [‹]  Title [badge]          [Actions]   [⛶]   [×]        │  header
├──────────────────────────────────────────────────────────┤
│ summary band (optional) — persists across every tab       │  summary
├──────────────────────────────────────────────────────────┤
│ [Details]  [Content]  [Preview]  [Settings]               │  tabs (≤4)
├──────────────────────────────────────────────────────────┤
│           body — whatever the active tab renders          │
├──────────────────────────────────────────────────────────┤
│ footer (optional) — persistent commit actions / next-up   │  footer
└──────────────────────────────────────────────────────────┘
```

- **`‹` back button** — visible when `canGoBack === true`. Pops the history stack.
- **Title + Eyebrow** — entity name. Optional **`titleBadge`** slot renders an inline glyph / icon run next to the title (entity-type icon + live status/streaming icons) — set at open or via `setTitleBadge`.
- **Actions slot** — typed `InspectorAction[]`. Auto-derived View public / Copy link when `preview.previewUrl` is set. Renders as icon-only chips via `<IconButton>` + the chip treatment (`border: 1px solid var(--cg-border)` + `background: var(--cg-bg-surface)` + `border-radius: var(--cg-radius-sm)`). Labels become `aria-label` + hover `title`, never visible. `placement: 'overflow'` always folds into a ⋯ menu (no width-based reflow). Dropdown items DO render icon + label.
- **`⛶` Expand** — universal size control. Drawer (~480px) ↔ fullscreen takeover. **Decoupled from edit mode** — expand is its own affordance, NEVER auto-fires on edit.
- **`×` close** — clears inspector + entire stack.
- **The four header controls (`‹` back · Actions · `⛶` · `×`) are ONE 28px chip** — same size, border (`--cg-border`), surface (`--cg-bg-surface`), radius (`--cg-radius-sm`), subtle hover — so the header cluster reads as one family (no 24/28/44 mismatch). **Two intentional tiers:** 28px for this header-CHROME cluster (always-present, touch-comfortable); **24px** for in-body + list-row action chips (the denser in-CONTENT tier). Uniform within each tier; never mix sizes inside the header cluster. *(2026-07-16: header controls standardized to 28px — this supersedes the earlier "inspector actions match library-row chips at 24px" note. The two surfaces are never seen side-by-side; the parity that matters is within-cluster.)*
- **Tab strip** — composes `<HqTab>` (in cmngrdn at `@/components/hq/tabs/HqTab`; hoist candidate). Max 4 tabs per surface; horizontal scroll on mobile if overflow.

### Optional chrome slots — summary · titleBadge · footer

Three additive, optional slots on `InspectorContext`. All default null, so every inspector that doesn't set them is unaffected — they never change the base chrome.

- **`summary`** (`setSummary` / `openInspector({ summary })`) — a persistent band rendered BETWEEN the header and the tab strip. It rides the chrome, not the body, so it **persists across every tab**. When a summary is present, the header collapses to auto-height (`.hq-inspector-header:has(+ .hq-inspector-summary)`) so header + summary read as ONE detail card — not a rigid 48px chrome bar with a band bolted under it. Use it for an entity glance / detail-card header: the name lives in the chrome title, the band carries meta + status + a progress viz. cmngrdn reference: the library catalog inspector's `<LifecycleSummary>` (artists / `N assets` / status · % / four-phase completeness bar).
- **`titleBadge`** (`setTitleBadge`) — inline glyph/icon run next to the title (see the Title bullet). Entity-type icon + live status/streaming icons; kept live via `setTitleBadge` on edit.
- **`footer`** (`setFooter`) — a persistent band below the body for commit actions (Send / Publish / Save) + a "next up" hint. **Ownership rule: the footer is owned by the body that holds the state it acts on** (the editor with the dirty/save state), NOT the outer inspector-body wrapper — otherwise two components race over `setFooter`. It rides that body's mount, so it's present only on the tab where that body is mounted. References: the transmission builder's send bar; the library editor's save + next-up footer.

**A slot control that drives a tab BODY needs more than an event.** Slots persist across every tab; a tab body only mounts on its own tab. So a control in a slot that targets the body — cmngrdn's catalog phase bar, which lives in `summary` and jumps the Details editor to a phase — has a mount asymmetry: clicked from another tab, the listener doesn't exist yet, and switching tabs doesn't help because the event fires a render before the body mounts. The shape that works: **dispatch AND park** the request, the mounted body handles it live, an unmounted one drains the park on mount, whichever gets there first clears it so it can't run twice — and **time-box the park**, or a request nobody claimed (tab switch cancelled, inspector closed) fires on the next unrelated record the operator opens. Reference: cmngrdn `src/components/hq/library/lifecycle-jump.ts`.

### Routing patterns (Pattern A / Pattern B)

Two patterns; chrome supports both transparently. New inspectors pick one.

**Pattern A — canonical preview + edit composition.** Chrome auto-composes when you pass `preview` + `editContent`. View mode renders `viewContent ?? preview` framed; edit mode renders preview-left + editor-right via `<PreviewEditorSplit>`. Most surfaces use this (portal pages, transmissions, inquiry forms, collectibles).

**Pattern B — tabbed body with per-tab routing.** Pass `content` (the tabbed body) + `canEdit`; DO NOT pass `editContent`. Body reads `activeTabId` + `mode` from `useInspector()` and renders per-tab view/edit content internally. Each tab may mount its own `<InspectorContent>` if it wants the preview/edit split. Used by surfaces with multiple top-level sub-concerns where each may have its own editor — e.g. Vault Passes `<ArtPieceInspector>` (Design / Eras / Tiers / Notifications / Analytics).

### Body composition (content-only)

A tab body renders the entity's **CONTENT** — never a page surface. The chrome owns the title bar, framing, and tabs; the body owns what sits below them.

- **No page header / self-title.** The chrome's title IS the title. A body that renders its own `<header><h1>` (or eyebrow + title + subtitle block) echoing the chrome title is a violation. Section sub-labels inside the body are fine; a page-level title is not.
- **No page-width / centered container.** No `maxWidth` + `margin: auto`, no large page padding. The body fills the inspector and uses inspector-scale padding.
- **Use a canonical tab role** from the table below — do NOT re-list them here. This line held a second copy for months and drifted: it named `editor` and `activity` and `thread` (two retired, one superseded) while omitting `content`, `timeline`, `notifications` and `email`. One list, one place.
- **Never drop a full-page route component into a tab.** A `/hq/...` page surface carries its own header + max-width container + page padding; mounting it verbatim "sticks a page in a box." Factor the chrome out (or gate it behind an in-inspector flag/context) so the body is content-only before mounting.

This applies to ANY surface opened in the inspector — preview-bearing or not, present or future. The same discipline that keeps framing in one place (above) keeps titling + chrome there too. (cmngrdn 2026-06-03: the Activity pullout's `<ActivityBody>` was de-chromed to a content-only `activity`-role body; Pulse-card pullouts render their chart chromeless via a `PulseDetailContext` so the chart's own panel title doesn't echo the chrome title — see cmngrdn CLAUDE.md § Inspector Contract for the implementation.)

### Preview slot + framePolicy

The `preview` slot at `openInspector()` time declares an explicit framePolicy. Chrome owns the framing — bodies NEVER wrap previews themselves.

- **`page`** (default) — visitor-facing page preview. Desktop screen + mobile viewport = iPhone frame; desktop viewport = 1280×800 (or 1440×900 when `desktopNaturalWidth: 1440`). Mobile screen = edge-to-edge in the bottom sheet (device IS the frame). Mobile/desktop viewport toggle visible on desktop only. Used by portal pages, transmissions, inquiry forms.
- **`artifact`** — identity / card preview without a device context. Centered on a neutral surface, no chrome, no toggle. Same treatment on every screen. Used by Vault Collectibles.
- **`desktop-only`** — surfaces that only make sense at desktop width (admin tooling, full-bleed dashboards). Always renders in desktop frame. No toggle. Reserved.
- **`mobile-only`** — surfaces whose audience consumes them on a phone (Apple Wallet passes, iOS push notifications, future SMS conversations). Always renders in iPhone frame on desktop; edge-to-edge on mobile screens. No toggle. Used by Vault Passes.

### Tab discipline

**≤4 tabs per surface. Always seeking to simplify, lessen, or merge.** The cap is
the goal, not a budget to spend — a fifth tab is a signal that two of the first
four are the same idea wearing different labels.

**Different entities need different compartments, so the SET is fixed and the
SELECTION is per-entity.** A portal page's four and a contact's four have no
obligation to match; what they must not do is invent a role outside this table.

**DON'T BUILD THE COMPARTMENT UNTIL IT HAS SOMETHING IN IT — and settle that by
COUNTING (2026-08-16).** Asked whether the tag inspector wanted `details` +
`linked`, the answer came from production row counts, not taste: `unlock_rules`
**0**, `workspace_segments` **0**, `intake_forms.auto_tags` **1** across the whole
workspace. So a `details` tab there is a name, a count and three empty dependency
lists — and **a tag ships with ONE tab**, `linked`, because a tag IS its members.

This is the same defect as a tab labelled with a `· soon` suffix, or a
placeholder tab describing a future version of the thing beside it: *an empty
room with a sign on the door reads as broken, where its absence reads as
nothing.* It recurs — the same surface had a placeholder `linked` tab pulled
once already before it grew a speculative `details`.

**The useful half is what to do with the rare-but-real case.** The one dependency
that DID exist moved into the chrome, where it changes a decision: the tag's
glance band reads *"Auto-applied by {form} — deleting won't stop it coming
back"*, and the delete confirm repeats it. **A one-tab surface is a correct
outcome, not a failure to fill the cap** — and it drops the tab strip entirely,
which is what lets the roster have the whole panel.

`TabRole` is the enforced union in cmngrdn `src/contexts/InspectorContext.tsx`.
**This table and that union are one thing — change both in the same commit, and
keep the file's docblock listing exactly what the union holds.** They drifted
apart once (see the drift note below) and the cost was a doc naming two roles
that would not compile while hiding six that would.

| Role | The record's… | The test | Notes |
|---|---|---|---|
| `details` | identity — what it IS | Always. The landing tab. | Universal (89 uses). Analytics lives here as a `<PulseSummaryCard>` drilldown, never as its own tab. |
| `content` | material — what it's MADE OF | The stuff is substantial enough to be its own place (portal modules, room tracks, crew documents) rather than a field. | |
| `preview` | outward face — what a visitor or recipient sees | There is a real external render. | Routes through `useInspector().preview` + `<InspectorContent>`. |
| `timeline` | history — what has HAPPENED to it, and what was SAID | Anything chronological. Events and messages interleave in one stream. | **Replaces `thread` + `activity`.** See the merge note. |
| `linked` | roster — other records it relates to, **count varying** | Apply the anchor-vs-roster test (`cmngrdn/docs/inspector-archetypes.md`): does the count vary per record? If it's a fixed 1–3, it is an ANCHOR and belongs in the body's relation strip, not in a tab. | |
| `variants` | alternates — other versions of ITSELF | Same entity, different edition (pass eras, tiers). Not other entities — that's `linked`. | Single-use today (Vault Passes); merge candidate with `content`. |
| `email` | two-way correspondence BY EMAIL, with the composer in it | The entity carries a real mail thread you reply to in place. **Not a synonym for `timeline`.** | Added 2026-08-16 when cmngrdn's inquiry `thread` was renamed. See the split note below. |
| `settings` | configuration that isn't the editor | Knobs a visitor never sees and the editor doesn't own. | Under review — the platform direction is Settings as a header gear, which returns a slot to every surface at once. |
| `notifications` | outbound — what this record SENDS, and when | The entity fires messages of its own, and they have bodies you author. Not "it has a notify toggle". | Resolved 2026-08-16 (see below). One declarer today (services); passes are the case that should join it. |

**Retired vocabulary.** `editor` — Pattern A's edit-mode chrome IS the editor, so
the role never existed in the union and no surface declared one. `analytics` —
never declared, and no tab anywhere is even *labelled* Analytics; after-the-fact
data ships as the `<PulseSummaryCard>` drilldown inside `details`. Both appeared
in this section before 2026-08-15 and neither was real.

#### `email` vs `timeline` — why the merge stops at the inbox (2026-08-16)

`timeline` exists because a relationship is ONE sequence, and cmngrdn's contact
proved it by making the CONVERSATION the substrate and drawing events into it.
That works because SMS is HTML *we* author, so an event card and a message
bubble are the same material.

**Inbound Gmail is not.** It is a foreign document — inline font sizes, table
widths, its own background colours, authored at 600px — so interleaving small
event cards between full-width foreign documents reads as documents with debris
between them rather than as one stream. The merge is right up to the point the
other party controls the rendering.

It is named for the MEDIUM rather than the shape on purpose: "Thread" and
"Timeline" are near-synonyms to a reader, so a tab row carrying both said
nothing about which to open. "Email" also names where what you type actually
goes — out of the workspace, into a real person's inbox.

**Open:** `cmngrdn/docs/inspector-archetypes.md` §9. A `thread` that carries a
COMPOSER still cannot fold into `timeline` until its composer can live in the
chrome footer — a timeline is READ and a thread is WRITTEN.

#### `availability` + `notifications` — resolved 2026-08-16, and they split

Both were used by exactly one surface (cmngrdn's service editor) and both were
"plausibly `settings` sub-sections". Reworking that surface split them, because
**the test for canonical is not how sensible a role reads — it is whether a
SECOND entity would plausibly declare it, and both questions had already been
answered elsewhere in the same module:**

- **`availability` RETIRED.** The booking CALENDAR is the other entity that owns
  availability, and it renders `<AvailabilityEditor>` as a SECTION inside its
  `details` body. The platform had already decided this shape once, one file
  away. Supporting measurement: of the six fields that tab held, four carry ONE
  distinct value across all 11 services in the production network — nobody has
  ever changed padding-before — so it was a compartment with nothing in it.
  Folded into `details` as a "Scheduling" group.
- **`notifications` KEPT**, and the deciding argument is the `settings` gear.
  `settings` is headed for a header gear, which is the right home for chrome
  configuration and the wrong one for substantive per-entity content. A
  service's four message editors ARE its content; behind a gear they would be
  buried. The pass inspector filing `NotificationsTabBody` under `settings` is
  therefore the case that should MOVE, not the precedent to follow.

**The generalisable half:** when deciding whether a narrow role survives, look
for the sibling entity that owns the same concept and see what IT did — and ask
whether the content is configuration (gear) or the entity's own material (tab).
Frequency of use is the weaker signal; both of these had exactly one declarer
and they still split.

#### The `thread` + `activity` → `timeline` merge

Two roles asking one question ("what happened, in order") forced surfaces to
spend two slots on one idea, and pushed at least one over the cap:

- cmngrdn `useRoomInspector` declares **five** — `details · content · thread ·
  activity · settings`. The merge is what brings it back to four.
- Inquiries declares `details · activity · thread`; Contacts declares
  `details · thread · linked`.

A contact's real timeline is one interleaved stream — inquiry received,
appointment booked, SMS sent, reply received — not two tabs the reader has to
join by eye. The atoms for it already exist and are voice-agnostic
(`ActivityFeed` / `ActivityCard` in cmngrdn, hoist candidates), so the caller
resolves operator-voice vs member-voice and the stream stays one component.

Pair the merge with the anchor-vs-roster rule above: once fixed relations move
out of `linked` and into the body's relation strip, a contact reads
`details · timeline` with slots to spare rather than three tabs and no room.

#### Drift note (2026-08-15)

This section, cmngrdn's `CLAUDE.md`, the `TabRole` union, and that union's own
docblock had four different answers — the docblock said "eight roles" over a
ten-member union, and this table listed five roles of which two did not exist.
**When you add a role, update the union, its docblock, and this table together,
and record why the role could not be an existing one.**

### Visual treatment + container rules

These rules are enforced. Breakage means drift across the platform.

- **Tab active state** — rounded top + elevated `--cg-bg-elevated` background + 2px accent underline + 600 weight. Inactive = transparent + transparent underline + 500 weight + muted text.
- **Active underline MUST touch the divider beneath the tabs row.** `<HqTab>` sets `margin-bottom: -1px` to overlap. Parent container MUST set `align-items: flex-end` (or `align-self: flex-end` on the tabs row inside). Without that, the underline floats above the line.
- **Container background cannot match active tab background.** Container = `var(--cg-bg)` or `transparent`. NEVER `var(--cg-bg-elevated)` (that's what active tab uses; container + active tab would visually merge).
- **All chrome heights use `--hq-chrome-height` (48px primary) or `--hq-chrome-subrow-height` (40px sub-rows).** Sidebar header, page header, inspector header, tab strips, filter strips — all on the same Y when stacked. Don't pick a one-off number.
- **All chrome bottom borders use `var(--cg-glass-border)`.** Content surfaces use `var(--cg-border)` (heavier definition).
- **Flex-pin shell pattern.** `.hq-module-shell` is `display: flex; flex-direction: column; height: 100%; overflow: hidden`. Direct children that aren't `.page-header` or `.hq-module-chrome` become the scrolling body. Chrome is structurally unable to scroll.

### When to skip these rules

You don't. If a surface needs a different chrome shape, the conversation is "should we change the rules?" not "should I roll a one-off." Bring it back to this section.

