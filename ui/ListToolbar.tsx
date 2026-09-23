"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ToolsRow } from "./ToolsRow";
import { ChipSplit, SortGlyph } from "./ChipSplit";
import { Shelf, ShelfGroup, FilterToggle, PulseToggle } from "./Shelf";
import { ChipAppliedClear } from "./ChipApplied";
import { ChipToggle, ChipSelect, ChipMultiSelect, ChipGroup, ChipSegment } from "./ControlChip";
import { Input } from "./Input";
import { Button } from "./Button";

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
 *   search   — always the same chip-height input.
 *   view     — the lens toggle.
 *   create   — a square "+" (icon only; `label` is its accessible name and
 *              tooltip). Hidden at narrow width — register the phone's create
 *              another way (cmngrdn: `usePageAction`).
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
  create?: { label: string; onClick: () => void; disabled?: boolean } | null;
  extra?: ReactNode;
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

type ShelfId = "sort" | "pulse" | null;

export function ListToolbar({ label, sort, filters, pulse, search, view, create, extra }: ListToolbarProps) {
  const [shelf, setShelf] = useState<ShelfId>(null);
  // THE FILTER DRAWER DEFAULTS TO OPEN WHILE FILTERS ARE ON (Feather,
  // 2026-09-23). It replaces the applied-filter chips beside search: the
  // drawer already names every active value, so a second readout of the same
  // fact cost the bar its width. The Filter control still toggles it either
  // way — closing it with filters on is a choice, and the badge keeps saying
  // how many. `null` = follow the default. Independent of the one-at-a-time
  // Sort/Pulse shelves.
  const [filterManual, setFilterManual] = useState<boolean | null>(null);
  const toggle = (id: Exclude<ShelfId, null>) => setShelf((cur) => (cur === id ? null : id));
  const uid = useId();
  const ids = { sort: `${uid}-sort`, filter: `${uid}-filter`, pulse: `${uid}-pulse` };

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    if (!search) return;
    if (!search.debounceMs) return search.onChange(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search.onChange(v), search.debounceMs);
  };

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
    setFilterManual(null);
  };
  const filterOpen = filterManual ?? active > 0;
  const sortLabel = sort?.options.find((o) => o.value === sort.value)?.label ?? sort?.value;

  return (
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
            <FilterToggle open={filterOpen} onToggle={() => setFilterManual(!filterOpen)} controls={ids.filter} badge={active} />
          )}
          {extra}
        </>
      }
      search={
        search ? (
          <Input
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
          />
        ) : undefined
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
      create={
        create ? (
          <Button
            variant="primary"
            size="chip"
            onClick={create.onClick}
            disabled={create.disabled}
            aria-label={create.label}
            title={create.label}
            iconLeft={<PlusGlyph />}
          />
        ) : undefined
      }
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
      {dims.length > 0 && (
        <Shelf open={filterOpen} id={ids.filter} label="Filters">
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
        </Shelf>
      )}
      {pulse && (
        <Shelf open={shelf === "pulse"} id={ids.pulse} label={pulse.title ?? "Pulse"} variant="panel">
          {shelf === "pulse" && pulse.render()}
        </Shelf>
      )}
    </ToolsRow>
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
