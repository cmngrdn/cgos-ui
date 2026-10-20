# Window contract — the app window, its band, records, the stub and the marks

**Design authority:** cgos [`docs/hq-system.md`](https://github.com/cmngrdn/cgos/blob/main/docs/hq-system.md) — the one HQ spec (2026-10-20). Rules are cited by number (W4, R5 …) and never restated here; this file says which atom carries which rule and how a consumer wires it. Where they disagree, the spec wins.

Replaces [`tools-row-contract.md`](tools-row-contract.md) and [`inspector-contract.md`](inspector-contract.md), which stay as history until the surfaces they describe retire (build plan Phase 3).

Landed in **v0.80.0**. Visual shells only: routing, context, auth and role gating stay in the consumer and arrive as props (G4).

## The atoms

| Atom | Rules | What the consumer passes |
|---|---|---|
| `ui/Window` → `Window`, `WindowBand` | W1–W5, M1–M5 | `app` (an `AppId`), `name`, `icon` (a `ModuleIconChip`), `homeHref`/`onHome`, `atHome`, `tabs` (`href` or `onSelect`, `current`, `soon`), `modes` (which of the four this viewer sees), `mode` + `onMode`, `query` + `onQuery`, `show` (a Show's chip), `renderLink` (the router's link). `Window` adds the glass frame, `panel` (the open mode's) and the body. |
| `ui/RecordWindowHead` | R5, R6, R12 | `app` (the record's HOME app — the tint), `face`, `title`, `context`, `details`, `status`, `saved`, `expand`, `onClose`, `progress`, `compact`. |
| `ui/Stub` | R3 | `app` (or `color`), `icon`, `label`, `onBack`, optional `onExpand` / `onClose`, `narrowed`. Untinted it is a folded record. |
| `ui/Mark` → `Dot`, `TurnChip`, `StageMark`, `BookingDot`, `fmtWaitShort` | K1–K5 | the fact only: a label; minutes + why; a `Stage` (+ `dim`, `more`); a `BookingMark` + its word. |
| `lib/apps` → `APP_IDS`, `AppId`, `appColor`, `isAppId`, `APP_HEX` | K6 | — `appColor(id)` is `var(--cg-app-<id>, #hex)`; nobody passes hex. |

## Tokens (v0.80.0)

- `--cg-app-<id>` — the nine app colours (palette C′). `npm run audit:apps` (CI) holds them equal to `lib/apps.ts`'s fallbacks.
- `--cg-aurora · --cg-sol · --cg-ember · --cg-frost · --cg-iris` and `--cg-stage-{new,talking,quoted,booked,done,closed}` — the marks' hues, deeper in the light theme. A consumer with a world-derived palette re-points them (cmngrdn's `.lv` maps them to `--lv-*`).
- `--cg-window-radius 18 · --cg-window-band-h 48 · --cg-window-gutter 16 · --cg-record-w 460` — W1, W6, R4.

## Behaviour the atoms own (no opt-out props, U3)

- **Tabs fold by measure** (W4): lay out everything, step the `soon` tabs aside, then fold into the name's menu (`data-fold`). Never a width breakpoint.
- **The four modes** are always Search · Adjust · Create · Setup, in that order, with the same glyphs. One at a time; a lit mode dims the tabs; **Esc** or the glyph again leaves; **`/`** opens Search when it is offered and focus is not in a field. A mode never opens by itself — the atom has no `defaultMode`.
- **Search keeps its query** when you leave it (M1): the atom never clears `query`; the consumer decides what an empty query shows.
- **The status sits alone bottom right; expand and close inside the head card top right** (R6). Next is not a head slot (R8).
- **A link inside the context line shrinks, it never vanishes whole** (`:has(> :is(a, button))` turns the line into a flex row).

## Adoption (cmngrdn `hq/frame-round-2`)

| Atom | Where it replaced what |
|---|---|
| `Mark` | `fluid/marks.tsx` (deleted), `.mk-*` in `living.css`, the Inbox's `.fi-unread` look and `.fi-stage` |
| `WindowBand` | `WindowHead`'s `.fl-wedge` / `.fl-wbadge` / `.fl-wtab` / `LensTab` in `fluid/engine.tsx` |
| `Stub` | `Strip` in `fluid/engine.tsx` now renders it (`.fl-strip*` retired) |
| `RecordWindowHead` | **Phase 3.5** — the engine's `RecordPlate` / `CardHead rich` carry tuned variants (a Studio's bare head, phone sheets, a card's own actions beside expand/close) and the close button's place is open (spec O2, pictures first). It replaces `RecordPlate` there, with the R5 tint, in one step. |
| `Window` (the frame + the four modes) | **Phase 3.1** — the tools row retires app by app as the modes land. |

`ListToolbar` / `ToolsRow`, the inspector chrome, `HqTab` for app tabs, `ListHeader` (name collision: cmngrdn's engine has its own `ListHeader`) and `--hq-chrome-*` retire as Phase 3 replaces them — never side by side for long.
