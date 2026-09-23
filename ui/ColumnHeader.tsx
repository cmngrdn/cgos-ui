"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { SPINE_VAR, type SpineToken } from "../lib/list";
import { placeMenuFor, type MenuPlacement } from "../lib/menu-placement";
import { ListCheckbox } from "./ListHeader";
import { useColumnDrag, type ListColumns } from "./useListColumns";
import "./ColumnHeader.css";

/**
 * THE TABLE — one primitive for every column list in the system (v0.74.0).
 *
 * Before this, four renderers drew column tables and shared only the engine
 * (`useListColumns` + `useColumnDrag`): cmngrdn's `DataList` (Crew, Rates, Pay
 * periods), `CatalogList` (Catalog), `InquiriesList` (virtualized) and this
 * atom (Appointments, Workspaces). Every header fix cost four edits and they
 * drifted anyway. Now there is one:
 *
 *  - `ColumnGrid`     — the table. Declares the tracks and hands them to
 *                       everything inside by context.
 *  - `ColumnHeader`   — THE one header row: select-all, the labels (click to
 *                       sort, drag to reorder, right-border grip to resize),
 *                       per-column filter funnels, bulk mode in place, list
 *                       actions (Export) at the right. The result count is NOT
 *                       here — it lives only in the tools bar.
 *  - `ColumnRow`      — a 56px row: spine, checkbox, nesting rail, lead art,
 *                       data cells, row actions.
 *  - `ColumnRows`     — a VIRTUALIZED body: only the rows in view are mounted.
 *  - `ColumnGroupRow` — a full-width group label ("Loose assets", "Today").
 *  - `ColumnEditCell` — a cell whose value is its own dropdown (inline edit).
 *  - `ColumnCards` / `ColumnCard` (ColumnCard.tsx) — the same records as
 *                       full-width cards, for a list's Cards view.
 *
 * THE SPREADSHEET MODEL (Google Sheets / Airtable — Feather, 2026-09-23).
 * Every column is a FIXED width — the name included — and ONE trailing filler
 * track (`minmax(0, 1fr)`) takes the leftover space. A column's grip is on its
 * RIGHT border; dragging it right widens that column and nothing else changes
 * size. When the columns outgrow the view the rows are wider than it and the
 * scroll container scrolls sideways (the header is inside the same scroller,
 * so it follows with no script).
 *
 * WHY THE ROWS ARE NOT `subgrid` ANY MORE. v0.71.0 made every row a subgrid
 * child so a track could be as wide as its widest label OR value. That is
 * exactly what a virtualized list cannot have — its rows are not all in the
 * DOM, so nothing can measure "the widest value" — and it is also what the
 * spreadsheet model removed: every track now has a width. So each row applies
 * `--cg-column-template` directly, and a row that is mounted alone (virtual)
 * draws on the same tracks as the header. A column with no width gets
 * `DEFAULT_COLUMN_WIDTH`, never `max-content`, because a content-sized track
 * would differ row by row.
 *
 * STATE IS NOT HERE. Order, widths and sort belong to `useListColumns` (one per
 * surface, persisted); this atom takes columns in display order and emits
 * `onSort` / `onMove` / `onResize`. `columnsFrom(defs, engine)` applies the
 * engine's order and widths to a surface's column definitions.
 *
 * Narrow (≤620px of the grid's OWN width — a container query): the labels go,
 * the header keeps only select-all / bulk / list actions, and each row reflows
 * its cells under the first column as labelled pairs. Nothing is `display: none`.
 *
 * NO PINNED COLUMN (Feather, 2026-09-23). An earlier cut had an optional
 * "lead" identity column that could not be dragged or dropped in front of.
 * Catalog and Crew had turned it off and Inquiries had not, so the SAME
 * primitive let you move a column to the first spot on one list and not the
 * next. Every column drags now, the name included — one behaviour, no opt-out.
 *
 * Spec: docs/list-row-template.md → "Table sibling"
 */

// ─────────────────────────────────────────────────────────────────────────
// Types

export interface ColumnFilter {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Display transform for an option value (`payment-missing` → "Payment missing"). */
  labelFor?: (value: string) => string;
}

export interface ColumnDef {
  id: string;
  label: string;
  /** Numbers read right-aligned; a status pill centred. Default `start`. */
  align?: "start" | "end" | "center";
  /** Default true. */
  sortable?: boolean;
  /** Drawn width, px — the engine's width when resized, else `defaultWidth`.
   *  `columnsFrom` fills it. */
  width?: number;
  /** A first-time visitor's width. Default `DEFAULT_COLUMN_WIDTH`. */
  defaultWidth?: number;
  /** Floor for resize. Default 48. */
  minWidth?: number;
  /** Header tooltip — what the column means when its label cannot say it. */
  title?: string;
  /** A funnel on the header: multi-select over `options`. */
  filter?: ColumnFilter;
  /** Narrow layout: `inline` cells share a line (badges, dates); the rest take
   *  half a line as a labelled pair. */
  inline?: boolean;
}

export type SortDir = "asc" | "desc";

/** @deprecated There is no pinned lead column any more (v0.74.0) — every
 *  column, the name included, drags and resizes like any other. This was its
 *  engine width key; a surface that converted its lead to a column reads it
 *  once to carry a saved width over. */
export const LEAD_COLUMN_ID = "__lead";

/** A column that declares no width. Never `max-content` — see the docblock. */
export const DEFAULT_COLUMN_WIDTH = 120;

const SELECT_W = 22;
const RAIL_W = 18;
const PREFIX_GAP = 10;

/** The surface's column definitions in the engine's saved ORDER, each with the
 *  engine's saved WIDTH (or its default). Unknown ids are dropped. */
export function columnsFrom<T extends ColumnDef>(defs: T[], engine: Pick<ListColumns, "order" | "widths">): T[] {
  const byId = new Map(defs.map((d) => [d.id, d]));
  return engine.order
    .map((id) => byId.get(id))
    .filter((d): d is T => !!d)
    .map((d) => ({ ...d, width: engine.widths[d.id] ?? d.width ?? d.defaultWidth ?? DEFAULT_COLUMN_WIDTH }));
}

/** Move `from` to the position `to` holds — so dropping a column on its right
 *  neighbour swaps them. Same rule as the engine's `moveColumnId`. */
export function moveColumnTo(order: string[], from: string, to: string): string[] {
  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  if (fi < 0 || ti < 0 || fi === ti) return order;
  const next = order.slice();
  next.splice(fi, 1);
  next.splice(ti, 0, from);
  return next;
}

function widthOf(c: ColumnDef): number {
  return Math.round(c.width ?? c.defaultWidth ?? DEFAULT_COLUMN_WIDTH);
}

/** The leading slot's width: checkbox · nesting rail · art, 10px apart. */
function prefixWidth(select: boolean, nest: boolean, art: number): number {
  const parts = [select ? SELECT_W : 0, nest ? RAIL_W : 0, art].filter((w) => w > 0);
  return parts.length ? parts.reduce((a, b) => a + b, 0) + PREFIX_GAP * (parts.length - 1) : 0;
}

export interface ColumnTemplateOptions {
  anchorWidth?: number;
  prefixWidth?: number;
}

/** The grid template: `[prefix] columns… filler [anchor]`. Only the
 *  filler flexes, so resizing a column changes only that column. */
export function columnTemplate(columns: ColumnDef[], opts: ColumnTemplateOptions = {}): string {
  const { anchorWidth = 0, prefixWidth: pw = 0 } = opts;
  return [
    ...(pw > 0 ? [`${pw}px`] : []),
    ...columns.map((c) => `${widthOf(c)}px`),
    "minmax(0, 1fr)",
    ...(anchorWidth > 0 ? [`${anchorWidth}px`] : []),
  ].join(" ");
}

// ─────────────────────────────────────────────────────────────────────────
// Grid

interface GridContext {
  columns: ColumnDef[];
  select: boolean;
  nest: boolean;
  artWidth: number;
  prefix: boolean;
  anchor: boolean;
  /** 1-based track indexes, for the header's explicit placement. */
  track: { prefix: number; firstColumn: number; filler: number };
  gridRef: { current: HTMLDivElement | null };
}

const ColumnGridContext = createContext<GridContext | null>(null);

function useGrid(): GridContext {
  const g = useContext(ColumnGridContext);
  if (!g) throw new Error("ColumnHeader / ColumnRow / ColumnRows must be inside a ColumnGrid");
  return g;
}

export interface ColumnGridProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** In display order, with widths — `columnsFrom(defs, engine)`. */
  columns: ColumnDef[];
  /** Rows carry a selection checkbox (and the header a select-all). */
  select?: boolean;
  /** Rows carry a nesting rail — the expand chevron / child guide. */
  nest?: boolean;
  /** Rows carry lead art (cover, avatar) in a square this many px wide. */
  artWidth?: number;
  /** People read as circles, records as rounded squares. Default `square`. */
  artShape?: "square" | "circle";
  /** A trailing row-actions track, px. 0 = none. (List actions in the header
   *  need no track — they sit at the header's right end.) `"auto"` is accepted
   *  for compatibility and means 0. */
  anchorWidth?: number | "auto";
  /** Names the table for assistive tech. */
  label?: string;
  rootRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

export function ColumnGrid({
  columns,
  select = false,
  nest = false,
  artWidth = 0,
  artShape = "square",
  anchorWidth = 0,
  label,
  rootRef,
  role = "table",
  style,
  children,
  ...rest
}: ColumnGridProps) {
  const anchorPx = typeof anchorWidth === "number" ? anchorWidth : 0;
  const pw = prefixWidth(select, nest, artWidth);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const prefixTrack = pw > 0 ? 1 : 0;
  const firstColumn = prefixTrack + 1;
  const ctx: GridContext = {
    columns,
    select,
    nest,
    artWidth,
    prefix: pw > 0,
    anchor: anchorPx > 0,
    track: { prefix: prefixTrack, firstColumn, filler: firstColumn + columns.length },
    gridRef,
  };
  // The tracks' own width (the filler at 0), for anything full-width that is
  // not a track row — a group label must reach as far as the rows when the
  // table scrolls sideways. Gaps and gutters are CSS vars, so the sum ends in CSS.
  const fixed = [pw, ...columns.map(widthOf), anchorPx].filter((w) => w > 0);
  const vars = {
    "--cg-column-template": columnTemplate(columns, { anchorWidth: anchorPx, prefixWidth: pw }),
    "--cg-column-tracks-w": `calc(${fixed.reduce((a, b) => a + b, 0)}px + ${fixed.length} * var(--cg-column-gap))`,
    "--cg-column-prefix-w": `${pw}px`,
    "--cg-column-art-w": `${artWidth}px`,
    ...style,
  } as CSSProperties;
  return (
    <ColumnGridContext.Provider value={ctx}>
      <div
        {...rest}
        ref={(el) => {
          gridRef.current = el;
          if (typeof rootRef === "function") rootRef(el);
          else if (rootRef) (rootRef as { current: HTMLDivElement | null }).current = el;
        }}
        data-cg-column-grid=""
        data-prefix={pw > 0 ? "" : undefined}
        data-art-shape={artWidth > 0 && artShape === "circle" ? "circle" : undefined}
        data-anchor={anchorPx > 0 ? "" : undefined}
        role={role}
        aria-label={label ?? rest["aria-label"]}
        style={vars}
      >
        {children}
      </div>
    </ColumnGridContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Header

export interface ColumnHeaderProps {
  sort?: { id: string; dir: SortDir } | null;
  /** A label was clicked. Same id again means flip — the engine's `toggleSort`,
   *  the SAME state the bar's Sort control reads. Two doors, one state. */
  onSort?: (id: string) => void;
  /** `from` was dropped on `to`. Omit to disable reorder. */
  onMove?: (from: string, to: string) => void;
  /** Live, during a resize drag. Omit to disable resize. */
  onResize?: (id: string, width: number) => void;
  /** Select-all — drawn in the checkbox slot (needs `ColumnGrid select`). */
  select?: { checked: boolean; indeterminate?: boolean; onToggle: () => void };
  /** Rows ticked. > 0 swaps the labels for "N selected" · `bulk` · Clear, in place. */
  selectedCount?: number;
  bulk?: ReactNode;
  onClearSelection?: () => void;
  /** A bulk write is in flight — the strip dims and stops taking clicks. */
  busy?: boolean;
  /** List-level actions (Export, Import), always at the right end. */
  actions?: ReactNode;
  /** @deprecated The result count lives in the tools bar, never in a header
   *  row (it widened the column it sat in). Ignored. */
  count?: ReactNode;
}

function SortArrow({ dir }: { dir: SortDir }) {
  // An SVG, not a "↓" glyph: a text arrow's width depends on which font
  // renders it (8.05px measured, in a 7px slot), so the slot could never be exact.
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === "asc" ? <path d="M4 7V1.5M1.5 3.75 4 1.25l2.5 2.5" /> : <path d="M4 1v5.5M1.5 4.25 4 6.75l2.5-2.5" />}
    </svg>
  );
}

export function ColumnHeader({
  sort,
  onSort,
  onMove,
  onResize,
  select,
  selectedCount = 0,
  bulk,
  onClearSelection,
  busy,
  actions,
}: ColumnHeaderProps) {
  const grid = useGrid();
  const { columns, track } = grid;
  const selecting = selectedCount > 0;
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  // The gestures are the shared `useColumnDrag` — the same reorder, resize and
  // click-vs-drag rules as every header in the system.
  const drag = useColumnDrag({
    order: columns.map((c) => c.id),
    onMove,
    onResize,
    minWidth: (id) => columns.find((c) => c.id === id)?.minWidth ?? 48,
  });
  // Every header cell is placed EXPLICITLY on row 1. The bulk strip overlays
  // the labels on the same row; with the labels auto-placed, the strip's cells
  // would be taken and they would wrap to a second row (it happened once).
  const at = (col: number | string): CSSProperties => ({ gridColumn: col, gridRow: 1 });
  const hasTools = !!select || !!actions;

  return (
    <div
      data-cg-column-head=""
      role="row"
      {...(drag.dragging ? { "data-dragging": "" } : {})}
      {...(selecting ? { "data-selecting": "" } : {})}
      {...(busy ? { "data-busy": "" } : {})}
      {...(hasTools ? { "data-tools": "" } : {})}
    >
      {grid.prefix && (
        <div data-cg-column-head-prefix="" role="columnheader" style={at(track.prefix)}>
          {select && grid.select && (
            <ListCheckbox
              checked={select.checked}
              indeterminate={select.indeterminate}
              onToggle={select.onToggle}
              label={select.checked ? "Deselect all" : "Select all"}
            />
          )}
        </div>
      )}
      {columns.map((col, i) => {
        const active = sort?.id === col.id;
        const sortable = col.sortable !== false && !!onSort;
        const cell = drag.cellProps(col.id);
        return (
          <div
            key={col.id}
            {...cell}
            style={{ ...cell.style, ...at(track.firstColumn + i) }}
            data-cg-column-head-cell=""
            data-align={col.align ?? "start"}
            {...(active ? { "data-active": "" } : {})}
            role="columnheader"
            aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
          >
            {onResize && <span data-cg-column-resize="" aria-hidden="true" {...drag.gripProps(col.id)} />}
            <button
              type="button"
              data-cg-column-head-label=""
              disabled={!sortable && !onMove}
              {...drag.labelProps(col.id, sortable ? () => onSort?.(col.id) : undefined)}
              title={
                [col.title, sortable && "Click to sort", onMove && "drag or Alt+←/→ to move"].filter(Boolean).join(" · ") ||
                undefined
              }
            >
              {col.label}
              <span data-cg-column-sort="" aria-hidden="true">
                {active && <SortArrow dir={sort!.dir} />}
              </span>
            </button>
            {col.filter && (
              <HeaderFunnel
                spec={col.filter}
                label={col.label}
                open={openFilter === col.id}
                onToggle={() => setOpenFilter((o) => (o === col.id ? null : col.id))}
                onClose={() => setOpenFilter(null)}
              />
            )}
          </div>
        );
      })}
      {selecting && (
        // Over the labels, in place. The labels stay laid out
        // (visibility, not display) so no track moves while you select.
        <div
          data-cg-column-head-bulk=""
          style={at(`${track.firstColumn} / ${track.filler}`)}
          aria-live="polite"
        >
          <span data-cg-column-head-selected="">{selectedCount} selected</span>
          {bulk}
          {onClearSelection && (
            <button type="button" data-cg-list-header-clear="" onClick={onClearSelection}>
              Clear
            </button>
          )}
        </div>
      )}
      {/* The filler and the anchor, as one cell: list actions ride the right
          end whether or not the rows have an actions track. */}
      <div data-cg-column-head-end="" role="columnheader" style={at(`${track.filler} / -1`)}>
        {actions}
      </div>
    </div>
  );
}

// ── Header funnel ─────────────────────────────────────────────────────────

function optionLabel(spec: ColumnFilter, v: string): string {
  // A selected value can round-trip through a URL and be stale; a consumer's
  // lookup is entitled to assume a legal one.
  return spec.labelFor && spec.options.includes(v) ? spec.labelFor(v) : v;
}

function HeaderFunnel({
  spec,
  label,
  open,
  onToggle,
  onClose,
}: {
  spec: ColumnFilter;
  label: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<MenuPlacement | null>(null);
  const n = spec.selected.length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const toggleVal = (v: string) => {
    const set = new Set(spec.selected);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    spec.onChange([...set]);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-cg-column-funnel=""
        {...(n ? { "data-active": "" } : {})}
        {...(open ? { "data-open": "" } : {})}
        aria-label={n ? `Filter ${label} — ${n} selected` : `Filter ${label}`}
        title={n ? `${label} — ${n} selected` : `Filter ${label}`}
        aria-expanded={open}
        aria-haspopup="menu"
        // A press on the funnel is never the start of a column reorder.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          if (!open && btnRef.current) setPlaced(placeMenuFor(btnRef.current, 168, 320));
          onToggle();
        }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill={n ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 3h12l-4.6 5.4v4.4l-2.8 1.4V8.4z" />
        </svg>
        {n > 0 && <span data-cg-column-funnel-n="" aria-hidden="true">{n}</span>}
      </button>
      {open &&
        placed &&
        createPortal(
          // Portalled and placed by the shared rule: a menu inside the sticky
          // header was clipped by any ancestor that scrolls.
          <div
            ref={menuRef}
            data-cg-column-menu=""
            role="menu"
            style={{ position: "fixed", ...placed }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {spec.options.length === 0 ? (
              <div data-cg-column-menu-empty="">No options</div>
            ) : (
              spec.options.map((opt) => {
                const checked = spec.selected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    data-cg-column-menu-item=""
                    {...(checked ? { "data-on": "" } : {})}
                    onClick={() => toggleVal(opt)}
                  >
                    <span data-cg-column-menu-check="" aria-hidden="true">
                      {checked && (
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3,8 7,12 13,4" />
                        </svg>
                      )}
                    </span>
                    <span data-cg-column-menu-label="">{optionLabel(spec, opt)}</span>
                  </button>
                );
              })
            )}
            {n > 0 && (
              <button type="button" data-cg-column-menu-clear="" onClick={() => spec.onChange([])}>
                Clear filter
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Row

/** A row's place in a tree: a parent that can open, or a child under one. */
export type ColumnNest = { expanded: boolean; onToggle: () => void } | "child";

export interface ColumnRowProps {
  /** Cell content by column id. A missing id renders an empty cell. */
  cells: Record<string, ReactNode>;
  /** Row actions, in the anchor track (`ColumnGrid anchorWidth`). Clicks inside
   *  never open the row. */
  anchor?: ReactNode;
  /** Lead art — cover, avatar, glyph — in the art square (`ColumnGrid artWidth`). */
  art?: ReactNode;
  /** Status spine on the row's left edge — the same tokens as the record row. */
  spine?: SpineToken;
  /** Row tooltip (what the spine means). */
  title?: string;
  onClick?: () => void;
  onContextMenu?: (e: ReactMouseEvent) => void;
  /** This record is the one open (inspector). `aria-current`. */
  selected?: boolean;
  /** Ticked for a bulk action. Needs `ColumnGrid select`. */
  checked?: boolean;
  /** The checkbox was clicked — the event carries `shiftKey` for ranges. */
  onCheck?: (e: ReactMouseEvent) => void;
  /** Accessible name of the row's checkbox. Default "Select row". */
  checkLabel?: string;
  /** The keyboard cursor is here (an accent rule, distinct from `selected`). */
  focused?: boolean;
  /** Nesting — needs `ColumnGrid nest`. */
  nest?: ColumnNest;
  /** DOM id — for a list shell's `aria-activedescendant`. */
  id?: string;
  rowRef?: Ref<HTMLDivElement>;
  /** Default: 0 when clickable. A list shell that owns the keys passes -1. */
  tabIndex?: number;
}

export function ColumnRow({
  cells,
  anchor,
  art,
  spine,
  title,
  onClick,
  onContextMenu,
  selected,
  checked,
  onCheck,
  checkLabel,
  focused,
  nest,
  id,
  rowRef,
  tabIndex,
}: ColumnRowProps) {
  const grid = useGrid();
  const parent = nest && nest !== "child" ? nest : null;
  return (
    <div
      ref={rowRef}
      id={id}
      data-cg-column-row=""
      role="row"
      title={title}
      tabIndex={tabIndex ?? (onClick ? 0 : undefined)}
      aria-selected={grid.select ? !!checked : undefined}
      aria-current={selected || undefined}
      {...(onClick ? { "data-interactive": "" } : {})}
      {...(selected ? { "data-selected": "" } : {})}
      {...(checked ? { "data-checked": "" } : {})}
      {...(focused ? { "data-focused": "" } : {})}
      {...(parent?.expanded ? { "data-expanded": "" } : {})}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={(e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (onClick && (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {spine && <span data-cg-column-row-spine="" aria-hidden="true" style={{ background: SPINE_VAR[spine] }} />}
      {grid.prefix && (
        <div data-cg-column-prefix="" role="cell">
          {grid.select && (
            <span data-cg-column-check="">
              {onCheck && (
                <ListCheckbox checked={!!checked} onToggle={onCheck} label={checkLabel ?? (checked ? "Deselect row" : "Select row")} />
              )}
            </span>
          )}
          {grid.nest && (
            <span data-cg-column-rail="">
              {nest === "child" ? (
                <span data-cg-column-guide="" aria-hidden="true" />
              ) : parent ? (
                <button
                  type="button"
                  data-cg-column-chevron=""
                  aria-label={parent.expanded ? "Collapse" : "Expand"}
                  aria-expanded={parent.expanded}
                  onClick={(e) => {
                    e.stopPropagation();
                    parent.onToggle();
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6,3 11,8 6,13" />
                  </svg>
                </button>
              ) : null}
            </span>
          )}
          {grid.artWidth > 0 && (
            <span data-cg-column-art="" aria-hidden="true">
              {art}
            </span>
          )}
        </div>
      )}
      {/* `display: contents` on desktop, so every cell keeps its own track; at
          narrow it becomes the two-up grid the cells share under the first. */}
      <div data-cg-column-cells="" role="none">
        {grid.columns.map((col) => (
          <div
            key={col.id}
            data-cg-column-cell=""
            data-align={col.align ?? "start"}
            data-label={col.label}
            {...(col.inline ? { "data-inline": "" } : {})}
            role="cell"
          >
            {cells[col.id] ?? null}
          </div>
        ))}
      </div>
      {grid.anchor && (
        <div data-cg-column-anchor="" role="cell" onClick={(e) => e.stopPropagation()}>
          {anchor}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Group row

export interface ColumnGroupRowProps {
  label: ReactNode;
  icon?: ReactNode;
  /** A readout after the label (how many rows the group holds). */
  count?: ReactNode;
  /** Collapsible when set. */
  expanded?: boolean;
  onToggle?: () => void;
  /** Accent the label (Appointments' "Today"). */
  accent?: boolean;
}

/** A full-width label between rows: a date bucket, a "Loose assets" drawer.
 *  Spans every track, so it never takes a column's place. */
export function ColumnGroupRow({ label, icon, count, expanded, onToggle, accent }: ColumnGroupRowProps) {
  const toggles = !!onToggle;
  return (
    <div
      data-cg-column-group=""
      role={toggles ? "button" : "row"}
      tabIndex={toggles ? 0 : undefined}
      aria-expanded={toggles ? !!expanded : undefined}
      {...(toggles ? { "data-interactive": "" } : {})}
      {...(accent ? { "data-accent": "" } : {})}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (toggles && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle!();
        }
      }}
    >
      {toggles && (
        <svg data-cg-column-group-caret="" {...(expanded ? { "data-open": "" } : {})} width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6,3 11,8 6,13" />
        </svg>
      )}
      {icon}
      <span data-cg-column-group-label="">{label}</span>
      {count !== undefined && <span data-cg-column-group-count="">{count}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Virtualized body

/** The nearest ancestor that scrolls vertically (by its overflow style), or
 *  null when the document does. */
function scrollParentOf(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const oy = getComputedStyle(node).overflowY;
    if (oy === "auto" || oy === "scroll" || oy === "overlay") return node;
    node = node.parentElement;
  }
  return null;
}

/** The container width below which rows reflow (keep in step with the CSS). */
const NARROW_PX = 620;

export interface ColumnRowsProps {
  count: number;
  /** Every row's height, px. Default 56 — `ColumnRow`'s. */
  rowHeight?: number;
  /** Render row `i`. Return a keyed `ColumnRow`. Called only for rows in view. */
  renderRow: (index: number) => ReactNode;
  /** Rows mounted beyond each edge of the view. Default 8. */
  overscan?: number;
  /** Keep this row in view — scrolls the minimum distance, clearing the sticky
   *  header. Pass the keyboard cursor's index; null = nothing. */
  scrollToIndex?: number | null;
}

/**
 * The rows of a `ColumnGrid`, virtualized: only the rows in view (plus
 * `overscan`) are mounted, whatever `count` is. Place it after the
 * `ColumnHeader`, inside the grid.
 *
 * IT DOES NOT SCROLL. The grid's nearest scrolling ancestor does — the same
 * element that scrolls sideways when the columns outgrow the view and that the
 * sticky header sticks to — and this measures its own offset in that scroller.
 * That is why Inquiries could not use a virtualized list and a sticky header at
 * once before: `VirtualList` WAS the scroller, so the header had to live
 * outside it and follow its `scrollLeft` by script.
 *
 * Below the narrow breakpoint rows reflow to variable heights, which the
 * fixed-height arithmetic cannot describe, so every row mounts there.
 */
export function ColumnRows({ count, rowHeight = 56, renderRow, overscan = 8, scrollToIndex = null }: ColumnRowsProps) {
  const grid = useGrid();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState<{ start: number; end: number }>({ start: 0, end: Math.min(count, 40) });
  const [narrow, setNarrow] = useState(false);
  const countRef = useRef(count);
  const measureRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const gridEl = grid.gridRef.current;
    if (!body) return;
    const scroller = scrollParentOf(body);
    const target: HTMLElement | Window = scroller ?? window;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const n = countRef.current;
      const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
      const viewH = scroller ? scroller.clientHeight : window.innerHeight;
      const top = body.getBoundingClientRect().top - viewTop;
      const first = Math.floor(Math.max(0, -top) / rowHeight);
      const last = Math.ceil(Math.max(0, viewH - top) / rowHeight);
      const start = Math.max(0, first - overscan);
      const end = Math.min(n, last + overscan);
      setRange((r) => (r.start === start && r.end === end ? r : { start, end }));
      if (gridEl) setNarrow(gridEl.clientWidth <= NARROW_PX);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measureRef.current = measure;
    measure();
    target.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    if (scroller) ro.observe(scroller);
    if (gridEl) ro.observe(gridEl);
    window.addEventListener("resize", schedule);
    return () => {
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [grid.gridRef, rowHeight, overscan]);

  // A count change (a filter narrowed or widened the list) re-measures now —
  // the window was computed against the old total.
  useLayoutEffect(() => {
    countRef.current = count;
    measureRef.current?.();
  }, [count]);

  // Bring the cursor's row into view, by the minimum distance. Only when the
  // index CHANGES — a count change (a new row arriving) must not yank the view
  // back to the cursor under the operator's hands (VirtualList, 2026-09-19).
  const scrolledTo = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (scrollToIndex == null) {
      scrolledTo.current = null;
      return;
    }
    if (scrolledTo.current === scrollToIndex) return;
    scrolledTo.current = scrollToIndex;
    const body = bodyRef.current;
    if (!body) return;
    const scroller = scrollParentOf(body);
    const head = grid.gridRef.current?.querySelector<HTMLElement>("[data-cg-column-head]");
    const headH = head?.getBoundingClientRect().height ?? 0;
    const viewTop = scroller ? scroller.getBoundingClientRect().top : 0;
    const viewH = scroller ? scroller.clientHeight : window.innerHeight;
    const rowTop = body.getBoundingClientRect().top - viewTop + scrollToIndex * rowHeight;
    const rowBottom = rowTop + rowHeight;
    let delta = 0;
    if (rowTop < headH) delta = rowTop - headH;
    else if (rowBottom > viewH) delta = rowBottom - viewH;
    if (!delta) return;
    if (scroller) scroller.scrollTop += delta;
    else window.scrollBy(0, delta);
  }, [scrollToIndex, rowHeight, grid.gridRef]);

  const all = narrow;
  const start = all ? 0 : Math.min(range.start, count);
  const end = all ? count : Math.min(range.end, count);
  const rows: ReactNode[] = [];
  for (let i = start; i < end; i++) rows.push(renderRow(i));
  return (
    <div ref={bodyRef} data-cg-column-body="" role="rowgroup">
      {/* flexShrink 0: a consumer that makes an ancestor a flex column must not
          be able to squash the spacers (VirtualList, 2026-09-19). */}
      {start > 0 && <div aria-hidden="true" style={{ height: start * rowHeight, flexShrink: 0 }} />}
      {rows}
      {end < count && <div aria-hidden="true" style={{ height: (count - end) * rowHeight, flexShrink: 0 }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Inline edit cell

export interface ColumnEditCellProps {
  /** What the cell shows at rest — exactly what a plain cell would render. */
  children: ReactNode;
  /** The column's name, for the accessible label. */
  label: string;
  value: string | null;
  options: string[];
  labelFor?: (value: string) => string;
  onChange: (next: string | null) => void | Promise<void>;
  /** Offer a "Clear" row. Default false. */
  clearable?: boolean;
}

/**
 * The value IS the control (Airtable's model — Feather, 2026-09-19: fast edits
 * without opening an inspector). At rest the cell looks exactly as rendered; a
 * caret appears on hover. A real button (Enter/Space open, Escape closes); the
 * menu is portalled and placed by `placeMenuFor`, because a row near the bottom
 * of a long list is most of the list. Clicks never open the row. The write is
 * the caller's — this closes the menu and gets out of the way.
 */
export function ColumnEditCell({ children, label, value, options, labelFor, onChange, clearable }: ColumnEditCellProps) {
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState<MenuPlacement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = (v: string) => labelFor?.(v) ?? v;

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    // Capture, so the menu closes before a click reaches the row beneath it. A
    // menu anchored to a row goes stale the moment the list scrolls.
    document.addEventListener("mousedown", onDoc, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDoc, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const choose = (next: string | null) => {
    setOpen(false);
    if (next !== value) void onChange(next);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-cg-column-edit=""
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${value ? name(value) : "not set"} — change`}
        onClick={(e) => {
          e.stopPropagation();
          if (open) return setOpen(false);
          if (btnRef.current) setPlaced(placeMenuFor(btnRef.current, 180, 260));
          setOpen(true);
        }}
      >
        {children}
        <span data-cg-column-edit-caret="" aria-hidden="true">▾</span>
      </button>
      {open &&
        placed &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            data-cg-column-menu=""
            style={{ position: "fixed", ...placed }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((o) => (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={o === value}
                data-cg-column-menu-item=""
                {...(o === value ? { "data-on": "" } : {})}
                onClick={() => choose(o)}
              >
                <span data-cg-column-menu-label="">{name(o)}</span>
              </button>
            ))}
            {clearable && value && (
              <button type="button" role="option" aria-selected={false} data-cg-column-menu-clear="" onClick={() => choose(null)}>
                Clear
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
