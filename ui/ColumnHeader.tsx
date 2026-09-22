"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { SPINE_VAR, type SpineToken } from "../lib/list";
import "./ColumnHeader.css";

/**
 * ColumnHeader — titled, sortable, reorderable, resizable columns over a list
 * that CANNOT drift off them (v0.71.0).
 *
 * THE LIST IS ONE GRID AND EVERY ROW IS `subgrid`. A header is only a header if
 * its cells sit over the row's, and per-column min-widths cannot guarantee
 * that: a track has to be the wider of its LABEL and its VALUES, and the label
 * is declared per surface. Measured before this: Crew's `COMPLIANCE` over a
 * 4-dot meter and Quests' `COMPLETED` both overflowed a fixed track and shoved
 * every later column 5–11px. With shared tracks, drift is not expressible.
 *
 * Exports:
 *  - `ColumnGrid`   — the one grid. Takes the columns IN DISPLAY ORDER and hands
 *                     them to everything inside by context.
 *  - `ColumnHeader` — row zero. Click a label to sort; drag a label to reorder;
 *                     drag the grip on a column's LEFT edge to resize it.
 *  - `ColumnRow`    — a row in the table archetype (56px). Takes its cells as a
 *                     record keyed by column id and lays them out in the grid's
 *                     order, so one ordering is read by the header AND every
 *                     row — the only way a reorder can be correct.
 *  - `moveColumnTo` — the reorder the header's `onMove` means.
 *
 * ⚠️ THIS IS THE SURFACE, NOT THE ENGINE. The column STATE — order, widths,
 * localStorage persistence, `sanitizeOrder`, storage-key bumps — belongs to the
 * one column engine cmngrdn is to merge from `DataList` and `CatalogList`
 * (list-chrome standard §5). This atom takes columns and emits `onSort`,
 * `onMove`, `onResize`; it holds no state that outlives a gesture. A header
 * without reorder, resize and persistence is not the feature — so wire all
 * three from that engine, never from a third one.
 *
 * GESTURES ARE POINTER EVENTS, NOT HTML5 DRAG-AND-DROP. The lab's reorder used
 * native `draggable`, which cannot be driven by anything but a real OS drag and
 * so was never verified; it also does not fire from touch in Safari. Pointer
 * events are both testable and touch-capable. Reorder starts after 4px of
 * movement, so a click is still a sort. Alt+←/→ on a focused label moves the
 * column by keyboard.
 *
 * RESIZE: one grip per column on its LEFT edge, resizing THAT column; dragging
 * left widens it. Skipped on the first data column, whose left neighbour is the
 * flexing identity column. Decision locked by Feather 2026-07-08
 * (cmngrdn `docs/hq-table-columns.md`). ⚠️ `DataList` later put its grip on the
 * RIGHT edge; that is a drift the engine merge must resolve toward this rule.
 *
 * Narrow (≤620px of the grid's own width, a container query): the header hides,
 * and each row REFLOWS its cells under the identity as labelled pairs — the
 * column label travels with the value, because position can no longer say what
 * it is. Nothing is `display: none`.
 *
 * Spec: docs/list-row-template.md → "Table sibling"
 */

export interface ColumnDef {
  id: string;
  label: string;
  /** Numbers read right-aligned; a status pill centred. Default `start`. */
  align?: "start" | "end" | "center";
  /** Default true. */
  sortable?: boolean;
  /** Resized width in px. Absent = the track sizes to the wider of the label
   *  and the widest value. */
  width?: number;
  /** Floor for resize. Default 48. */
  minWidth?: number;
}

export type SortDir = "asc" | "desc";

interface GridContext {
  columns: ColumnDef[];
  anchor: boolean;
}

const ColumnGridContext = createContext<GridContext>({ columns: [], anchor: false });

/** The grid template: identity flexes, every data column sizes to content (or
 *  its resized width), the anchor is fixed. Exported for a consumer that has to
 *  lay out something else on the same tracks. */
export function columnTemplate(columns: ColumnDef[], anchorWidth = 0): string {
  const cols = columns.map((c) => (c.width ? `${Math.round(c.width)}px` : "max-content"));
  return ["minmax(0, 1fr)", ...cols, ...(anchorWidth > 0 ? [`${anchorWidth}px`] : [])].join(" ");
}

/** Move `from` to the position `to` holds — so dropping a column on its right
 *  neighbour swaps them. `DataList`, `CatalogList` and the lab all insert BEFORE
 *  the target instead, which makes a one-step rightward move a no-op (and
 *  Alt+→ would do nothing); the merged engine should adopt this. */
export function moveColumnTo(order: string[], from: string, to: string): string[] {
  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  if (fi < 0 || ti < 0 || fi === ti) return order;
  const next = order.slice();
  next.splice(fi, 1);
  next.splice(ti, 0, from);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────

export interface ColumnGridProps {
  /** In display order — apply the engine's saved order before passing. */
  columns: ColumnDef[];
  /** Width of a trailing anchor column (a caret, an action). 0 = none. */
  anchorWidth?: number;
  /** Names the table for assistive tech. */
  label?: string;
  children: ReactNode;
}

export function ColumnGrid({ columns, anchorWidth = 0, label, children }: ColumnGridProps) {
  const style = { "--cg-column-template": columnTemplate(columns, anchorWidth) } as CSSProperties;
  return (
    <ColumnGridContext.Provider value={{ columns, anchor: anchorWidth > 0 }}>
      <div data-cg-column-grid="" role="table" aria-label={label} style={style}>
        {children}
      </div>
    </ColumnGridContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────

export interface ColumnHeaderProps {
  /** The identity column's title. Default "Name". */
  lead?: string;
  /** Px from the identity column's left edge to where its TEXT starts (thumb +
   *  gap), so the lead label sits over the title rather than over the art. */
  leadInset?: number;
  sort?: { id: string; dir: SortDir } | null;
  /** A label was clicked. Same id again means flip direction — the consumer's
   *  sort state decides, and it is the SAME state the bar's sort control reads.
   *  Two doors, one state; never two sort models. */
  onSort?: (id: string) => void;
  /** `from` was dropped on `to` — see `moveColumnTo`. Omit to disable reorder. */
  onMove?: (from: string, to: string) => void;
  /** Live, during a resize drag. Omit to disable resize. */
  onResize?: (id: string, width: number) => void;
}

const DRAG_THRESHOLD = 4;

export function ColumnHeader({ lead = "Name", leadInset = 0, sort, onSort, onMove, onResize }: ColumnHeaderProps) {
  const { columns, anchor } = useContext(ColumnGridContext);
  const [dragging, setDragging] = useState<string | null>(null);
  const indexOf = (id: string | null) => columns.findIndex((c) => c.id === id);
  const [over, setOver] = useState<string | null>(null);
  const cells = useRef(new Map<string, HTMLDivElement>());
  const gesture = useRef<{ id: string; x: number; active: boolean } | null>(null);
  const overRef = useRef<string | null>(null);
  const swallowClick = useRef(false);

  const columnAt = (x: number): string | null => {
    for (const [id, el] of cells.current) {
      const r = el.getBoundingClientRect();
      // Half the column gap on each side, so the seam between two labels still
      // counts as a target rather than a dead zone.
      if (x >= r.left - 8 && x <= r.right + 8) return id;
    }
    return null;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (!onMove || e.button !== 0) return;
    gesture.current = { id, x: e.clientX, active: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (!g.active) {
      if (Math.abs(e.clientX - g.x) < DRAG_THRESHOLD) return;
      g.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(g.id);
    }
    const hit = columnAt(e.clientX);
    const next = hit && hit !== g.id ? hit : null;
    if (next !== overRef.current) {
      overRef.current = next;
      setOver(next);
    }
  };

  const endGesture = (commit: boolean) => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.active) {
      swallowClick.current = true;
      if (commit && overRef.current) onMove?.(g.id, overRef.current);
    }
    overRef.current = null;
    setDragging(null);
    setOver(null);
  };

  const startResize = (e: ReactPointerEvent<HTMLSpanElement>, col: ColumnDef) => {
    if (!onResize || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const cell = cells.current.get(col.id);
    if (!cell) return;
    const grip = e.currentTarget;
    grip.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startW = cell.getBoundingClientRect().width;
    const min = col.minWidth ?? 48;
    const move = (ev: PointerEvent) => onResize(col.id, Math.max(min, startW - (ev.clientX - startX)));
    const done = () => {
      grip.removeEventListener("pointermove", move);
      grip.removeEventListener("pointerup", done);
      grip.removeEventListener("pointercancel", done);
    };
    grip.addEventListener("pointermove", move);
    grip.addEventListener("pointerup", done);
    grip.addEventListener("pointercancel", done);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!onMove || !e.altKey) return;
    const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    const target = columns[index + step];
    if (!step || !target) return;
    e.preventDefault();
    onMove(columns[index].id, target.id);
  };

  return (
    <div data-cg-column-head="" role="row" {...(dragging ? { "data-dragging": "" } : {})}>
      <div data-cg-column-head-lead="" role="columnheader" style={{ paddingLeft: leadInset }}>
        {lead}
      </div>
      {columns.map((col, i) => {
        const active = sort?.id === col.id;
        const sortable = col.sortable !== false && !!onSort;
        return (
          <div
            key={col.id}
            ref={(el) => {
              if (el) cells.current.set(col.id, el);
              else cells.current.delete(col.id);
            }}
            data-cg-column-head-cell=""
            data-align={col.align ?? "start"}
            {...(active ? { "data-active": "" } : {})}
            {...(dragging === col.id ? { "data-dragging": "" } : {})}
            {...(over === col.id
              ? // Which side the column will land on — `moveColumnTo` puts it in
                // the target's place, so a rightward move lands AFTER it.
                { "data-over": indexOf(over) > indexOf(dragging) ? "after" : "before" }
              : {})}
            role="columnheader"
            aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
            onPointerDown={(e) => onPointerDown(e, col.id)}
            onPointerMove={onPointerMove}
            onPointerUp={() => endGesture(true)}
            onPointerCancel={() => endGesture(false)}
          >
            {onResize && i > 0 && (
              <span
                data-cg-column-resize=""
                aria-hidden="true"
                onPointerDown={(e) => startResize(e, col)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <button
              type="button"
              data-cg-column-head-label=""
              disabled={!sortable && !onMove}
              onClick={() => {
                if (swallowClick.current) {
                  swallowClick.current = false;
                  return;
                }
                if (sortable) onSort?.(col.id);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
              title={
                [sortable && "Click to sort", onMove && "drag or Alt+←/→ to move"].filter(Boolean).join(" · ") ||
                undefined
              }
            >
              {col.label}
              <span data-cg-column-sort="" aria-hidden="true">
                {active && (
                  // An SVG, not a "↓" glyph: a text arrow's width depends on
                  // which font renders it (8.05px measured, in a 7px slot), so
                  // the reserved slot could never be exact.
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    {sort!.dir === "asc" ? <path d="M4 7V1.5M1.5 3.75 4 1.25l2.5 2.5" /> : <path d="M4 1v5.5M1.5 4.25 4 6.75l2.5-2.5" />}
                  </svg>
                )}
              </span>
            </button>
          </div>
        );
      })}
      {anchor && <div data-cg-column-head-anchor="" role="columnheader" aria-hidden="true" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

export interface ColumnRowProps {
  /** The identity cell — thumb, title, sub. The one flexing member. */
  lead: ReactNode;
  /** Cell content by column id. A missing id renders an empty cell, so the
   *  tracks stay aligned. */
  cells: Record<string, ReactNode>;
  /** Content of the anchor column, when the grid has one. */
  anchor?: ReactNode;
  /** Status spine on the row's left edge — the same tokens as the record row. */
  spine?: SpineToken;
  onClick?: () => void;
  selected?: boolean;
}

export function ColumnRow({ lead, cells, anchor, spine, onClick, selected }: ColumnRowProps) {
  const { columns, anchor: hasAnchor } = useContext(ColumnGridContext);
  return (
    <div
      data-cg-column-row=""
      role="row"
      tabIndex={onClick ? 0 : undefined}
      aria-selected={selected || undefined}
      {...(onClick ? { "data-interactive": "" } : {})}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {spine && <span data-cg-column-row-spine="" aria-hidden="true" style={{ background: SPINE_VAR[spine] }} />}
      <div data-cg-column-lead="" role="rowheader">
        {lead}
      </div>
      {columns.map((col) => (
        <div key={col.id} data-cg-column-cell="" data-align={col.align ?? "start"} data-label={col.label} role="cell">
          {cells[col.id] ?? null}
        </div>
      ))}
      {hasAnchor && (
        <div data-cg-column-anchor="" role="cell">
          {anchor}
        </div>
      )}
    </div>
  );
}
