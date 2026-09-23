"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

/**
 * useListColumns — THE column engine for every list that has a header (v0.73.0).
 *
 * Owns, per list, three facts and remembers all three across reloads and
 * sign-ins (localStorage, one key per surface):
 *
 *   order  — the column order the operator dragged into
 *   widths — the columns the operator resized (unresized ones size to content)
 *   sort   — the column + direction the list is ordered by
 *
 * WHY ONE ENGINE. Before this, cmngrdn had four: `DataList` (Crew, Rates, Pay
 * periods) persisted order + widths but not sort and put its resize grip on the
 * RIGHT edge; `CatalogList` persisted order + widths with its own copy of the
 * same code and the grip on the LEFT; Inquiries persisted widths only and could
 * neither reorder nor sort from its header; Appointments sorted from its header
 * but could not reorder or resize. Sort lived in the URL on some surfaces and
 * in component state on others, so it "reset" on the next visit either way.
 * Feather: headers must sort by click, reorder by drag, and keep all of it —
 * everywhere a header exists.
 *
 * SORT IS ONE STATE WITH TWO DOORS. The header click and the bar's Sort control
 * (`ListToolbar`'s `sort`) both read and write `sort` here, so changing one
 * moves the other in the same render. Sort ids are not restricted to columns —
 * a list may sort by its lead ("Name") or a field it doesn't show.
 *
 * Pair with `useColumnDrag` for the header gestures; `ColumnHeader` uses both.
 */

export type ColumnSortDir = "asc" | "desc";
export interface ColumnSortState {
  id: string;
  dir: ColumnSortDir;
}

export interface ColumnSpec {
  id: string;
  /** Direction a FIRST click on this column sorts by (dates/amounts read best
   *  newest/largest first). Default `asc`. */
  defaultDir?: ColumnSortDir;
}

interface Saved {
  v: 1;
  order: string[];
  widths: Record<string, number>;
  sort: ColumnSortState | null;
}

export interface ListColumns {
  /** Column ids in display order — saved order, sanitised against the
   *  surface's current columns (unknown ids dropped, new ones appended). */
  order: string[];
  widths: Record<string, number>;
  sort: ColumnSortState | null;
  setSort: (sort: ColumnSortState | null) => void;
  /** Header click: same column flips direction; a new column sorts by its
   *  `defaultDir`. */
  toggleSort: (id: string) => void;
  /** `from` takes `to`'s position — so a drop on the right neighbour swaps. */
  move: (from: string, to: string) => void;
  setWidth: (id: string, width: number) => void;
  /** Back to the surface's declared order, auto widths and default sort. */
  reset: () => void;
}

function read(key: string): Saved | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Saved>;
    return s && s.v === 1 ? (s as Saved) : null;
  } catch {
    return null;
  }
}

function write(key: string, s: Saved) {
  try {
    window.localStorage.setItem(key, JSON.stringify(s));
  } catch {
    /* private mode / quota — the list still works, it just won't remember */
  }
}

/** Saved order ∩ current ids, then any id the saved order never saw. */
export function sanitizeOrder(saved: string[] | undefined, ids: string[]): string[] {
  const known = (saved ?? []).filter((id) => ids.includes(id));
  return [...known, ...ids.filter((id) => !known.includes(id))];
}

export function moveColumnId(order: string[], from: string, to: string): string[] {
  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  if (fi < 0 || ti < 0 || fi === ti) return order;
  const next = order.slice();
  next.splice(fi, 1);
  next.splice(ti, 0, from);
  return next;
}

export function useListColumns(opts: {
  /** One per surface — `cg-hq-crew`, `cg-hq-catalog`. Bump a suffix when the
   *  column set changes materially, so an old layout cannot leak into it. */
  storageKey: string;
  columns: ColumnSpec[];
  defaultSort?: ColumnSortState | null;
}): ListColumns {
  const { storageKey, columns, defaultSort = null } = opts;
  const ids = columns.map((c) => c.id);
  const idsKey = ids.join("|");

  const [state, setState] = useState<Saved>(() => ({ v: 1, order: ids, widths: {}, sort: defaultSort }));
  const stateRef = useRef(state);

  // Hydrate AFTER mount: reading localStorage in the initializer would differ
  // between the server render and the client's and tear the hydration.
  useEffect(() => {
    const saved = read(storageKey);
    const next: Saved = {
      v: 1,
      order: sanitizeOrder(saved?.order, idsKey.split("|")),
      widths: saved?.widths ?? {},
      sort: saved ? saved.sort : defaultSort,
    };
    stateRef.current = next;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time, SSR-safe hydration from storage
    setState(next);
    // `defaultSort` is read once, on hydration, by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, idsKey]);

  // Persistence rides the mutations (event handlers), never an effect — an
  // effect would write the pre-hydration defaults over the saved layout.
  const update = useCallback(
    (fn: (s: Saved) => Saved) => {
      const next = fn(stateRef.current);
      stateRef.current = next;
      setState(next);
      write(storageKey, next);
    },
    [storageKey],
  );

  const dirFor = (id: string) => columns.find((c) => c.id === id)?.defaultDir ?? "asc";

  return {
    order: sanitizeOrder(state.order, ids),
    widths: state.widths,
    sort: state.sort,
    setSort: (sort) => update((s) => ({ ...s, sort })),
    toggleSort: (id) =>
      update((s) => ({
        ...s,
        sort: s.sort?.id === id ? { id, dir: s.sort.dir === "asc" ? "desc" : "asc" } : { id, dir: dirFor(id) },
      })),
    move: (from, to) => update((s) => ({ ...s, order: moveColumnId(sanitizeOrder(s.order, ids), from, to) })),
    setWidth: (id, width) => update((s) => ({ ...s, widths: { ...s.widths, [id]: Math.round(width) } })),
    reset: () => update(() => ({ v: 1, order: ids, widths: {}, sort: defaultSort })),
  };
}

// ─────────────────────────────────────────────────────────────────────────

/**
 * useColumnDrag — the header GESTURES, shared by every header (v0.73.0).
 *
 * Pointer events, not HTML5 drag-and-drop: native `draggable` cannot be driven
 * by anything but a real OS drag, does not fire from touch in Safari, and was
 * what DataList used when "you can't move any of the columns". Here:
 *
 *  - press and move ≥ 4px on a header cell → reorder; release over another
 *    column → `onMove(from, to)`. A press without movement is still a click
 *    (sort), and the click after a drag is swallowed.
 *  - RESIZE IS THE SPREADSHEET MODEL (Google Sheets, Airtable — Feather,
 *    2026-09-23): the grip sits on a column's RIGHT border (the line between
 *    it and the next header); dragging right widens THAT column, left narrows
 *    it, and nothing else changes size — later columns just move along. The
 *    first cut put the grip on the LEFT edge with the name column absorbing
 *    the slack, so a drag moved other columns and felt like it resized the
 *    opposite side. Tables using this must give every column a FIXED width
 *    (the lead included) and put the leftover space in a trailing filler.
 *  - Alt+← / Alt+→ on a focused header label moves the column by keyboard.
 *
 * Spread `cellProps(id)` on each header cell, `gripProps(id)` on its grip,
 * `labelProps(id, onSort)` on the clickable label.
 */
export function useColumnDrag(opts: {
  order: string[];
  onMove?: (from: string, to: string) => void;
  onResize?: (id: string, width: number) => void;
  minWidth?: (id: string) => number;
}) {
  const { order, onMove, onResize, minWidth } = opts;
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const cells = useRef(new Map<string, HTMLElement>());
  const gesture = useRef<{ id: string; x: number; active: boolean } | null>(null);
  const overRef = useRef<string | null>(null);
  const swallowClick = useRef(false);

  const columnAt = (x: number): string | null => {
    for (const [id, el] of cells.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left - 8 && x <= r.right + 8) return id;
    }
    return null;
  };

  const end = (commit: boolean) => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.active) {
      // Swallow ONLY the click that ends this drag. Pointer capture sends that
      // click to the cell, not the label, so a flag left standing ate the NEXT
      // real sort click instead — measured: a drag, then two clicks on a
      // header, sorted once. A zero-delay reset runs after the synthetic click.
      swallowClick.current = true;
      setTimeout(() => {
        swallowClick.current = false;
      }, 0);
      if (commit && overRef.current) onMove?.(g.id, overRef.current);
    }
    overRef.current = null;
    setDragging(null);
    setOver(null);
  };

  const cellProps = (id: string) => ({
    ref: (el: HTMLElement | null) => {
      if (el) cells.current.set(id, el);
      else cells.current.delete(id);
    },
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (!onMove || e.button !== 0) return;
      gesture.current = { id, x: e.clientX, active: false };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const g = gesture.current;
      if (!g) return;
      if (!g.active) {
        if (Math.abs(e.clientX - g.x) < 4) return;
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
    },
    onPointerUp: () => end(true),
    onPointerCancel: () => end(false),
    "data-col-dragging": dragging === id ? "" : undefined,
    // Which side the column will land on: `moveColumnId` puts it in the
    // target's place, so a rightward move lands AFTER the target.
    "data-col-over": over === id ? (order.indexOf(id) > order.indexOf(dragging ?? "") ? "after" : "before") : undefined,
    style: { touchAction: "none" as const },
  });

  const gripProps = (id: string) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (!onResize || e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      // The grip lives INSIDE the cell it resizes, so its parent is the cell —
      // which also lets a non-reorderable cell (the lead) be resized.
      const cell = cells.current.get(id) ?? e.currentTarget.parentElement;
      if (!cell) return;
      const grip = e.currentTarget;
      grip.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startW = cell.getBoundingClientRect().width;
      const min = minWidth?.(id) ?? 48;
      // Right border: the edge you grab is the edge that moves with the cursor.
      const move = (ev: PointerEvent) => onResize(id, Math.max(min, startW + (ev.clientX - startX)));
      const done = () => {
        grip.removeEventListener("pointermove", move);
        grip.removeEventListener("pointerup", done);
        grip.removeEventListener("pointercancel", done);
      };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", done);
      grip.addEventListener("pointercancel", done);
    },
    onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
  });

  const labelProps = (id: string, onSort?: () => void) => ({
    onClick: () => {
      if (swallowClick.current) {
        swallowClick.current = false;
        return;
      }
      onSort?.();
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (!onMove || !e.altKey) return;
      const i = order.indexOf(id);
      const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const target = order[i + step];
      if (!step || !target) return;
      e.preventDefault();
      onMove(id, target);
    },
  });

  return { dragging, over, cellProps, gripProps, labelProps };
}
