"use client";

import type { ReactNode } from "react";
import "./ToolsRow.css";

/**
 * ToolsRow — the bar above a list. One row, N shelves (v0.71.0).
 *
 * Every list surface does the same five jobs above its rows — sort, filter,
 * search, switch view, create — and before this each did them in its own strip:
 * four implementations, six heights (41 · 45 · 49 · 56.6 · 89, and none), a
 * search box at 28, 32 or 43.6px beside 28px chips. This is the contract those
 * strips were missing, as an atom.
 *
 *   ┌───────────────────────────────────────────────────────────────────┐
 *   │ [left]   [search]   [applied…]            [count] [right] [create] │  bar
 *   ├───────────────────────────────────────────────────────────────────┤
 *   │ shelf (children) — at most one open, plus Selection                │
 *   └───────────────────────────────────────────────────────────────────┘
 *
 *  - `left`    changes what you are LOOKING AT — a sort `ChipSplit`, Filter and
 *              Pulse `ShelfToggle`s.
 *  - `search`  an `<Input size="chip" type="search">`. The slot owns its width:
 *              a 280px CEILING (it is not an elastic member — `flex: 1` let it
 *              eat ~600px, eight times the longest thing anybody types) and a
 *              200px FLOOR (without one, two applied filters squeezed it to
 *              142px). Both measured in the lab.
 *  - `applied` `ChipApplied`s — which filters are on. Pass nothing when nothing
 *              filters; the slot disappears and the bar is quiet.
 *  - `count`   the number of records shown.
 *  - `right`   changes what you are VIEWING AS — the view toggle.
 *  - `create`  changes what EXISTS — a `<Button size="chip">`.
 *  - children  the shelves, as `<Shelf>`s.
 *
 * ONE CONTROL HEIGHT. Every control above reads `--cg-control-h-chip`, and the
 * bar's height is DERIVED from it (control + 4px each side = 36px), never
 * typed. Nothing in the bar can drift by picking a different atom, because
 * every atom that belongs here has a `chip` size.
 *
 * NARROW is a CONTAINER query (≤620px of the row's own width), not a media
 * query — a list is not always the width of the window; it sits in splits,
 * rails and inspectors. Row 1 becomes the `left` controls; row 2 is search with
 * the view toggle beside it. `count`, `applied` and `create` hide.
 * ⚠️ A module that hides its create button this way must offer create another
 * way on a phone (cmngrdn: `usePageAction`), or it silently has none.
 *
 * Spec: docs/subsystems/tools-row-contract.md
 */

export interface ToolsRowProps {
  left?: ReactNode;
  search?: ReactNode;
  applied?: ReactNode;
  count?: ReactNode;
  right?: ReactNode;
  create?: ReactNode;
  /** Names the bar for assistive tech — "Inquiries tools". */
  label?: string;
  /** The shelves. */
  children?: ReactNode;
}

export function ToolsRow({ left, search, applied, count, right, create, label, children }: ToolsRowProps) {
  const hasApplied = applied !== undefined && applied !== null && applied !== false;
  return (
    <div data-cg-tools-row="">
      <div data-cg-tools-row-bar="" role="group" aria-label={label}>
        {left && <div data-cg-tools-row-left="">{left}</div>}
        {search && <div data-cg-tools-row-search="">{search}</div>}
        {hasApplied && <div data-cg-tools-row-applied="">{applied}</div>}
        {(count !== undefined || right || create) && (
          <div data-cg-tools-row-right="">
            {count !== undefined && (
              <span data-cg-tools-row-count="" aria-live="polite">
                {count}
              </span>
            )}
            {right}
            {create && <span data-cg-tools-row-create="">{create}</span>}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
