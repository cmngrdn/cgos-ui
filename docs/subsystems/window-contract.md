# Window contract — the app window, its band, records, the stub and the marks

**Design authority:** cgos [`docs/hq-system.md`](https://github.com/cmngrdn/cgos/blob/main/docs/hq-system.md) — the one HQ spec (2026-10-20). Rules are cited by number (W4, R5 …) and never restated here; this file says which atom carries which rule and how a consumer wires it. Where they disagree, the spec wins.

Replaces [`tools-row-contract.md`](tools-row-contract.md) and [`inspector-contract.md`](inspector-contract.md), which stay as history until the surfaces they describe retire (build plan Phase 3).

Landed in **v0.80.0**. Visual shells only: routing, context, auth and role gating stay in the consumer and arrive as props (G4).

## The atoms

| Atom | Rules | What the consumer passes |
|---|---|---|
| `ui/Window` → `Window`, `WindowBand` | W1–W5, M1–M5 | `app` (an `AppId`), `name`, `icon` (a `ModuleIconChip`), `homeHref`/`onHome`, `atHome`, `tabs` (`href` or `onSelect`, `current`, `soon`), `modes` (which of the four this viewer sees), `mode` + `onMode`, `query` + `onQuery`, `show` (a Show's chip), `renderLink` (the router's link). `Window` adds the glass frame, `panel` (the open mode's) and the body. |
| `ui/RecordWindowHead` | R5, R6, R12 | `app` (the record's HOME app — the tint), `face`, `title`, `context`, `details`, `status`, `saved`, `actions` (v0.81.0 — the record's own controls, left of expand/close), `expand`, `onClose`, `progress`, `compact`. |
| `ui/Stub` | R3 | `app` (or `color`), `icon`, `label`, `onBack`, optional `onExpand` / `onClose`, `narrowed`. Untinted it is a folded record. |
| `ui/Mark` → `Dot`, `TurnChip`, `StageMark`, `BookingDot`, `fmtWaitShort` | K1–K5 | the fact only: a label; minutes + why; a `Stage` (+ `dim`, `more`); a `BookingMark` + its word. |
| `lib/apps` → `APP_IDS`, `AppId`, `appColor`, `isAppId`, `APP_HEX` | K6 | — `appColor(id)` is `var(--cg-app-<id>, #hex)`; nobody passes hex. |

## Tokens (v0.80.0)

- `--cg-app-<id>` — the app colours (palette C′), with a **Day value per app in the light block** (v0.84.0: same hue, deep enough to read as text on paper). `npm run audit:apps` (CI) holds both equal to `lib/apps.ts` (`APP_HEX`, `APP_HEX_DAY`) and measures the Day values.
- `--cg-glass-edge` — optional; a consumer sets it to a gradient for a look that lights the top edge of its glass (v0.84.0). `Window` draws it as a hairline; unset, nothing.
- `--cg-mark-hollow` · `--cg-mark-hollow-dim` — the rings of a cancelled / unconfirmed booking (v0.84.0), deeper in the light theme.
- `--cg-aurora · --cg-sol · --cg-ember · --cg-frost · --cg-iris` and `--cg-stage-{new,talking,quoted,booked,done,closed}` — the marks' hues, deeper in the light theme. A consumer with a world-derived palette re-points them (cmngrdn's `.lv` maps them to `--lv-*`).
- `--cg-window-radius 18 · --cg-window-band-h 48 · --cg-window-gutter 16 · --cg-record-w 460` — W1, W6, R4.

## Behaviour the atoms own (no opt-out props, U3)

- **Tabs fold by measure** (W4): lay out everything, step the `soon` tabs aside, then fold into the name's menu (`data-fold`). Never a width breakpoint.
- **The band reads left to right (v0.82.0, Feather 2026-10-21):** name · tabs · **Setup as the last tab** (a gear — it changes what you look at, as a tab does) · then **Create · Adjust · Search**, right after the tabs (a hairline between). **Search is one control**: its glyph widens into the field, growing rightward with the query, so nothing to its left moves and the tabs stay readable. With `searchOpen`/`onSearchOpen` Search runs **beside** the other modes (a query and Adjust at once); without them it is one of the modes, as before. **Esc** steps back one at a time (search first, keeping its query, then the mode); **`/`** opens Search; the **name** leaves any mode, Setup included. A mode never opens by itself — the atom has no `defaultMode`.
- **Search keeps its query** when you leave it (M1): the atom never clears `query`; the consumer decides what an empty query shows.
- **No `MagnifyingGlass` inside the field**: the field IS the glyph's box (one control, v0.82.0).
- **The status sits alone bottom right; the record's own controls, then expand and close, inside the head card top right** (R6). Next is not a head slot (R8).
- **Every row is one fixed height** (title 21 · context 19 · details 17), so heads match without padding whatever a line holds.
- **A link inside the context line shrinks, it never vanishes whole** (`:has(> :is(a, button))` turns the line into a flex row).

## Adoption (cmngrdn `hq/frame-round-2`)

| Atom | Where it replaced what |
|---|---|
| `Mark` | `fluid/marks.tsx` (deleted), `.mk-*` in `living.css`, the Inbox's `.fi-unread` look and `.fi-stage` |
| `WindowBand` | `WindowHead`'s `.fl-wedge` / `.fl-wbadge` / `.fl-wtab` / `LensTab` in `fluid/engine.tsx` |
| `Stub` | `Strip` in `fluid/engine.tsx` now renders it (`.fl-strip*` retired) |
| `RecordWindowHead` | **v0.81.0 (Phase 3.5)** — the engine's `RecordPlate` renders it: `RecordHead` reads the plate's tint, status, controls and progress from context, so every record head (a card's, a Studio's own plate, the phone sheet's, the Inbox's records) is this atom. The close button's place is R6's for every record window: inside the head card, top right. |
| `Window` (the frame + the four modes) | **Phase 3.1** — the tools row retires app by app as the modes land. |

`ListToolbar` / `ToolsRow`, the inspector chrome, `HqTab` for app tabs, `ListHeader` (name collision: cmngrdn's engine has its own `ListHeader`) and `--hq-chrome-*` retire as Phase 3 replaces them — never side by side for long.
