"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ToolsRow } from "./ToolsRow";
import { ChipSplit, SortGlyph } from "./ChipSplit";
import { Shelf, ShelfGroup, FilterToggle, PulseToggle, SearchToggle } from "./Shelf";
import { ChipAppliedClear } from "./ChipApplied";
import { ChipToggle, ChipSelect, ChipMultiSelect, ChipGroup, ChipSegment } from "./ControlChip";
import { Input } from "./Input";
import { Button } from "./Button";
import { Popover } from "./Popover";

/**
 * ListToolbar — THE bar above every list, as configuration (v0.72.0).
 *
 * v0.71.0 shipped the parts (`ToolsRow`, `ChipSplit`, `Shelf`, `ChipApplied`)
 * and let each surface assemble them. Within one sweep that produced a Filter
 * button with a funnel on one page and without it on four, sort on some lists
 * and not others, search missing from two, and a create button that said
 * "New quest" on one page and "+" on the next. Parts are not a standard; the
 * assembly is. So the assembly lives here, and a surface only DECLARES:
 *
 *   sort     — the fields you can order by. Always a `ChipSplit` + Sort shelf.
 *   filters  — every dimension, once. It drives the shelf, the badge on the
 *              Filter control AND the applied readout beside search, so the
 *              three can never disagree.
 *   pulse    — the module's numbers. A live readout on the shut control; the
 *              content mounts only while the shelf is open. Stat lenses (a
 *              row of counted `StatChip`s) belong HERE, not in a row of their
 *              own — they are the module's numbers that happen to filter.
 *   search   — a square glyph on the bar; the field is its own drawer (2026-09-28).
 *   view     — the lens toggle.
 *   create   — a square "+" (icon only; `label` is its accessible name and
 *              tooltip). Hidden at narrow width — register the phone's create
 *              another way (cmngrdn: `usePageAction`). With `choices` the +
 *              asks WHICH new thing first, in a small menu under itself
 *              (v0.75.0) — see `CreateControl`.
 *   extra    — surface-specific bar controls whose state this cannot see (a
 *              period picker). Rendered after Pulse.
 *
 * List-level actions (Export, Import) and the select-all checkbox are NOT
 * here — they are about the rows, so they live on the row header:
 * `ListHeader`, or `ColumnHeader` for a table.
 *
 * Spec: docs/subsystems/tools-row-contract.md
 */

export interface ListSort {
  options: Array<{ value: string; label: string }>;
  value: string;
  dir: "asc" | "desc";
  /** A different field was picked on the shelf. */
  onChange: (value: string) => void;
  /** The arrow was pressed. */
  onFlip: () => void;
}

export interface ListFilterDimension {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
  /** Zero-or-one value (a lens). Picking another replaces it. */
  single?: boolean;
  /** Rendered after this dimension's control — a match-mode toggle (Any /
   *  All), say. */
  trailing?: ReactNode;
  /**
   * `"toggles"` draws the options as a row of chips instead of a dropdown —
   * but ONLY for a FIXED vocabulary (options defined in code: status, state,
   * kind) of at most `TOGGLE_MAX` short options. Anything that comes from
   * RECORDS (blasts, tags, forms, calendars, artists, countries) stays a
   * dropdown whatever its count today, because it grows and its labels are
   * whatever someone typed. Default: dropdown.
   */
  display?: "toggles";
}

export interface ListToolbarProps {
  label?: string;
  sort?: ListSort;
  filters?: ListFilterDimension[];
  pulse?: { readout: ReactNode; render: () => ReactNode; title?: string };
  search?: {
    /** Controlled… */
    value?: string;
    /** …or uncontrolled (a URL-driven, debounced search keeps typing local). */
    defaultValue?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Debounce `onChange` by this many ms. */
    debounceMs?: number;
  };
  view?: {
    segments: Array<{ value: string; icon: ReactNode; title: string }>;
    value: string;
    onChange: (value: string) => void;
  };
  create?: ListToolbarCreate | null;
  extra?: ReactNode;
  /** How many records the list shows — "1,804 items". NOT on the bar since
   *  2026-09-28: a total is the module's numbers, so it heads the Pulse drawer,
   *  and it answers "how many matched?" at the end of the Search and Filter
   *  drawers. Never in a column header either — there it widened its column
   *  (2026-09-23). */
  count?: ReactNode;
}

/**
 * DROPDOWN BY DEFAULT; TOGGLES ARE THE EXCEPTION YOU OPT INTO (v0.72.0).
 *
 * v0.72.0's first cut decided by COUNT — eight options or fewer became a row
 * of toggle chips — so the same kind of filter was a dropdown in one
 * workspace and a wall of chips in the next, depending only on how much data
 * it had. SMS "Blasts" (a handful of long campaign names) ate a whole shelf
 * row that way. The deciding factor is where the options COME FROM: a fixed
 * vocabulary may opt into toggles (`display: "toggles"`) when it is this small;
 * everything else is a dropdown chip, so a Filter shelf reads as one compact
 * row: `Status ▾  Form ▾  Blast ▾  Tag ▾`.
 */
const TOGGLE_MAX = 4;

type ShelfId = "sort" | "filter" | "search" | "pulse" | null;

export interface ListToolbarCreateChoice {
  id: string;
  label: string;
  /** One line under the label — what this kind of new thing is for. */
  description?: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface ListToolbarCreate {
  label: string;
  /** What the + does when there are no `choices`. */
  onClick?: () => void;
  disabled?: boolean;
  /**
   * Two or more kinds of new thing from one list — the SMS inbox makes a
   * one-to-one message OR a transmission. The + opens a menu of these rather
   * than the bar growing a second create button, which is the whole reason it
   * exists: a bar that grows a button per kind runs out of width first on a
   * phone. The first choice is focused, so ↵ takes it.
   */
  choices?: ListToolbarCreateChoice[];
}

/**
 * The bar's "+". Plain button without `choices`; a menu-button with them.
 *
 * The menu is keyboard-complete because the + is: ↓/↑ walk the choices, ↵ or
 * Space takes one, Esc closes (Popover). Focus lands on the first choice when
 * it opens and returns to the + when it closes without a pick, so a keyboard
 * operator is never left focused on nothing.
 */
function CreateControl({ create }: { create: ListToolbarCreate }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const choices = create.choices && create.choices.length > 0 ? create.choices : null;

  useEffect(() => {
    if (!open) return;
    // After the Popover's own layout pass has placed the panel.
    const raf = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>("[data-cg-create-choice]")?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) anchorRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);

  function onMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[data-cg-create-choice]") ?? [],
    );
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? Math.min(at + 1, items.length - 1) : Math.max(at - 1, 0);
    items[next]?.focus();
  }

  return (
    <span ref={anchorRef} data-cg-create-anchor="">
      <Button
        variant="primary"
        size="chip"
        onClick={choices ? () => setOpen((v) => !v) : create.onClick}
        disabled={create.disabled}
        aria-label={create.label}
        title={create.label}
        aria-haspopup={choices ? "menu" : undefined}
        aria-expanded={choices ? open : undefined}
        iconLeft={<PlusGlyph />}
      />
      {choices && (
        <Popover
          open={open}
          onClose={() => close(true)}
          anchorRef={anchorRef}
          minWidth={220}
          preferredHeight={choices.length * 52 + 8}
          role="menu"
          ariaLabel={create.label}
          className="cg-create-menu"
        >
          <div ref={menuRef} onKeyDown={onMenuKeyDown}>
            {choices.map((c) => (
              <button
                key={c.id}
                type="button"
                role="menuitem"
                data-cg-create-choice=""
                onClick={() => {
                  close(false);
                  c.onSelect();
                }}
              >
                {c.icon && <span className="cg-create-choice-icon" aria-hidden="true">{c.icon}</span>}
                <span className="cg-create-choice-text">
                  <span className="cg-create-choice-label">{c.label}</span>
                  {c.description && (
                    <span className="cg-create-choice-desc">{c.description}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </Popover>
      )}
    </span>
  );
}

export function ListToolbar({ label, sort, filters, pulse, search, view, create, extra, count }: ListToolbarProps) {
  // ONE DRAWER AT A TIME, AND A SHUT DRAWER KEEPS WORKING (2026-09-28).
  // Sort, Filter, Search and Pulse are four drawers under one bar; opening one
  // closes the other. Closing never undoes what was set in it — the choice
  // folds into its control: the sort field on the split, "Filter 2" on the
  // badge, a filled glyph for a live query. Nothing opens on its own: the
  // Filter drawer used to open whenever a filter was on (2026-09-23), which on
  // a list with a DEFAULT filter (the SMS inbox's "Wrote back") meant a drawer
  // open on every visit. The badge carries the count; the drawer is a tap away.
  const [shelf, setShelf] = useState<ShelfId>(null);
  const toggle = (id: Exclude<ShelfId, null>) => setShelf((cur) => (cur === id ? null : id));
  const uid = useId();
  const ids = { sort: `${uid}-sort`, filter: `${uid}-filter`, search: `${uid}-search`, pulse: `${uid}-pulse` };

  const barRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // The glyph's readout needs the live query even when the search is
  // uncontrolled (a URL-driven, debounced search keeps typing local).
  const [typed, setTyped] = useState(search?.value ?? search?.defaultValue ?? "");
  const query = search?.value !== undefined ? search.value : typed;

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    if (!search) return;
    setTyped(v);
    if (!search.debounceMs) return search.onChange(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search.onChange(v), search.debounceMs);
  };

  // Opening the Search drawer puts the cursor in the field — the drawer IS the
  // field, so a second tap to reach it would be the old box with extra steps.
  useEffect(() => {
    if (shelf !== "search") return;
    const raf = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
  }, [shelf]);

  // "/" opens Search from anywhere on the page that is not already a text
  // field — what makes a drawer as fast as a box on a keyboard. Only a bar
  // that is actually on screen answers, so a hidden split's bar stays quiet.
  const hasSearch = !!search;
  useEffect(() => {
    if (!hasSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // The wrapper is `display: contents` (no box of its own), so ask the row.
      const row = barRef.current?.firstElementChild;
      if (!row || row.getClientRects().length === 0) return;
      e.preventDefault();
      setShelf("search");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasSearch]);

  const dims = (filters ?? []).filter((d) => d.options.length > 0);
  const labelOf = (d: ListFilterDimension, v: string) => d.options.find((o) => o.value === v)?.label ?? v;
  const active = dims.reduce((n, d) => n + d.value.length, 0);
  const flip = (d: ListFilterDimension, v: string) => {
    const on = d.value.includes(v);
    if (d.single) d.onChange(on ? [] : [v]);
    else d.onChange(on ? d.value.filter((x) => x !== v) : [...d.value, v]);
  };
  const clearAll = () => {
    dims.forEach((d) => d.value.length > 0 && d.onChange([]));
  };
  const sortLabel = sort?.options.find((o) => o.value === sort.value)?.label ?? sort?.value;
  const countLine = count !== undefined && count !== null ? <span data-cg-shelf-count="" aria-live="polite">{count}</span> : null;

  return (
    <div ref={barRef} data-cg-list-toolbar="">
    <ToolsRow
      label={label}
      left={
        <>
          {sort && (
            <ChipSplit
              label={sortLabel}
              open={shelf === "sort"}
              onOpen={() => toggle("sort")}
              controls={ids.sort}
              openTitle="Sort by…"
              modifier={<SortGlyph dir={sort.dir} />}
              modifierLabel={sort.dir === "asc" ? "Ascending — press for descending" : "Descending — press for ascending"}
              onModifier={sort.onFlip}
            />
          )}
          {dims.length > 0 && (
            <FilterToggle open={shelf === "filter"} onToggle={() => toggle("filter")} controls={ids.filter} badge={active} />
          )}
          {search && (
            <SearchToggle open={shelf === "search"} onToggle={() => toggle("search")} controls={ids.search} query={query} />
          )}
          {extra}
        </>
      }
      right={
        pulse || (view && view.segments.length > 1) ? (
          <>
            {/* Pulse sits with the view toggle (Feather, 2026-09-23): both
                change how you SEE the list, neither changes what is in it. */}
            {pulse && (
              <PulseToggle open={shelf === "pulse"} onToggle={() => toggle("pulse")} controls={ids.pulse} readout={pulse.readout} />
            )}
            {view && view.segments.length > 1 && (
              <ChipGroup>
                {view.segments.map((s) => (
                  <ChipSegment key={s.value} active={view.value === s.value} onClick={() => view.onChange(s.value)} title={s.title}>
                    {s.icon}
                  </ChipSegment>
                ))}
              </ChipGroup>
            )}
          </>
        ) : undefined
      }
      create={create ? <CreateControl create={create} /> : undefined}
    >
      {sort && (
        <Shelf open={shelf === "sort"} id={ids.sort} label="Sort by">
          <ShelfGroup label="Sort by">
            {sort.options.map((o) => (
              <ChipToggle
                key={o.value}
                label={o.label}
                active={sort.value === o.value}
                shape="pill"
                onClick={() => {
                  if (o.value !== sort.value) sort.onChange(o.value);
                }}
              />
            ))}
          </ShelfGroup>
        </Shelf>
      )}
      {search && (
        <Shelf open={shelf === "search"} id={ids.search} label="Search">
          <span data-cg-shelf-search="">
            <Input
              ref={searchRef}
              size="chip"
              type="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore=""
              data-lpignore="true"
              placeholder={search.placeholder ?? "Search…"}
              aria-label={search.placeholder ?? "Search"}
              {...(search.value !== undefined ? { value: search.value } : { defaultValue: search.defaultValue })}
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={(e) => {
                // Esc folds the drawer away and KEEPS the query — the glyph
                // stays filled, so the list still says it is searched.
                if (e.key === "Escape") {
                  e.preventDefault();
                  setShelf(null);
                }
              }}
            />
          </span>
          {/* No clear chip: a `type="search"` field carries the platform's own
              clear button, and a second one beside it read as two ways to do
              one thing (and "Clear all" is the wrong word for a query). */}
          {query.trim() && countLine}
        </Shelf>
      )}
      {dims.length > 0 && (
        <Shelf open={shelf === "filter"} id={ids.filter} label="Filters">
          {dims.map((d) =>
            d.display === "toggles" && d.options.length <= TOGGLE_MAX ? (
              // Toggles: the group label names the row of chips.
              <ShelfGroup key={d.key} label={d.label}>
                {d.options.map((o) => (
                  <ChipToggle key={o.value} label={o.label} active={d.value.includes(o.value)} onClick={() => flip(d, o.value)} shape="pill" />
                ))}
                {d.trailing}
              </ShelfGroup>
            ) : (
              // A dropdown chip already carries its own label ("Blast ▾"), so
              // it needs no group label — that is what keeps the row compact.
              <span key={d.key} data-cg-shelf-group="" role="group" aria-label={d.label}>
                {d.single ? (
                  <ChipSelect
                    label={d.label}
                    value={d.value[0] ?? ""}
                    options={d.options.map((o) => o.value)}
                    onChange={(v) => d.onChange(v ? [v] : [])}
                    labelFor={(v) => labelOf(d, v)}
                    shape="rect"
                  />
                ) : (
                  <ChipMultiSelect
                    label={d.label}
                    value={d.value}
                    options={d.options.map((o) => o.value)}
                    onChange={d.onChange}
                    labelFor={(v) => labelOf(d, v)}
                    shape="rect"
                  />
                )}
                {d.trailing}
              </span>
            ),
          )}
          {active > 0 && <ChipAppliedClear onClear={clearAll} />}
          {countLine}
        </Shelf>
      )}
      {pulse && (
        <Shelf open={shelf === "pulse"} id={ids.pulse} label={pulse.title ?? "Pulse"} variant="panel">
          {shelf === "pulse" && (
            <>
              {countLine && <div data-cg-shelf-pulse-count="">{countLine}</div>}
              {pulse.render()}
            </>
          )}
        </Shelf>
      )}
    </ToolsRow>
    </div>
  );
}

function PlusGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <line x1="6" y1="1.5" x2="6" y2="10.5" />
      <line x1="1.5" y1="6" x2="10.5" y2="6" />
    </svg>
  );
}
