"use client";

import type { MouseEvent, ReactNode } from "react";
import "./ListHeader.css";

/**
 * ListHeader — the ONE row between the bar and the rows (v0.72.0).
 *
 *   [☐]  124 inquiries                                   [Export] [Import]
 *   [☑]  3 selected   [Set status] [Add tag] [Delete]  Clear   [Export]
 *
 * Before this, every list with selection drew its own version of this row and
 * they disagreed: Inquiries' bulk bar was a bordered 40px card with Export
 * inside it, Audience's was a different bar with Export up in the filter
 * strip, Crew's lived inside the table engine. Same job, three shapes. The
 * rule now:
 *
 *  - SELECT-ALL, THE COUNT and LIST-LEVEL ACTIONS (Export, Import) are about
 *    the rows, so they sit on the rows' own header — not in the tools bar,
 *    which is about how you look at the list.
 *  - Selecting rows does NOT add a row. The same row switches: the count
 *    becomes "3 selected" and `bulk` appears beside it (Gmail's model). The
 *    bar-height budget is spent once.
 *  - Height = the tools bar's (chip + 4px each side), so the two rows above a
 *    list read as one instrument.
 *
 * A TABLE does not use this: its column header row carries the same
 * checkbox, count, bulk and actions (`ColumnHeader`'s `select` / `count` /
 * `bulk` / `actions`), because a table already spends a row on labels.
 *
 * `inset` aligns the checkbox over the rows' own checkboxes. The default is
 * `UniversalListRow`'s selection slot (3px spine + 10px gap + 8px margin).
 *
 * `ListCheckbox` is the one tri-state checkbox for a list — the header's and
 * every row's — so the two cannot be drawn differently.
 */

export interface ListHeaderProps {
  /** Select-all. Omit on a list without selection. */
  select?: { checked: boolean; indeterminate?: boolean; onToggle: () => void };
  /** Resting label. The list's COUNT belongs in the bar (`ListToolbar`
   *  `count`), not here — a header row that exists only to show a count is a
   *  row the list does not need. */
  count?: ReactNode;
  /** Rows currently ticked. > 0 switches the row to bulk mode. */
  selectedCount?: number;
  /** Bulk actions, shown only while `selectedCount > 0`. Chip-size buttons. */
  bulk?: ReactNode;
  onClearSelection?: () => void;
  /** List-level actions (Export, Import), always at the right. Chip-size. */
  actions?: ReactNode;
  /** Px from the gutter to the checkbox. Default aligns with UniversalListRow. */
  inset?: number;
}

export function ListHeader({
  select,
  count,
  selectedCount = 0,
  bulk,
  onClearSelection,
  actions,
  inset = 21,
}: ListHeaderProps) {
  const selecting = selectedCount > 0;
  return (
    <div data-cg-list-header="" {...(selecting ? { "data-selecting": "" } : {})}>
      {select && (
        <span data-cg-list-header-select="" style={{ marginLeft: inset }}>
          <ListCheckbox
            checked={select.checked}
            indeterminate={select.indeterminate}
            onToggle={select.onToggle}
            label={select.checked ? "Deselect all" : "Select all"}
          />
        </span>
      )}
      <span data-cg-list-header-count="" aria-live="polite">
        {selecting ? `${selectedCount} selected` : count}
      </span>
      {selecting && bulk && <span data-cg-list-header-bulk="">{bulk}</span>}
      {selecting && onClearSelection && (
        <button type="button" data-cg-list-header-clear="" onClick={onClearSelection}>
          Clear
        </button>
      )}
      {actions && <span data-cg-list-header-actions="">{actions}</span>}
    </div>
  );
}

export interface ListCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  /** Receives the click, so a list can read `shiftKey` for range selection. */
  onToggle: (e: MouseEvent) => void;
  /** Accessible name — "Select Susie Lawless". */
  label: string;
}

/** The list's checkbox. Stops its own click, because every home for it is
 *  inside a row that opens a record on click. */
export function ListCheckbox({ checked, indeterminate, onToggle, label }: ListCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      title={label}
      data-cg-list-checkbox=""
      {...(checked ? { "data-checked": "" } : {})}
      {...(indeterminate && !checked ? { "data-indeterminate": "" } : {})}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        onToggle(e);
      }}
    >
      {checked ? (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3,8 7,12 13,4" />
        </svg>
      ) : indeterminate ? (
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <line x1="3.5" y1="8" x2="12.5" y2="8" />
        </svg>
      ) : null}
    </button>
  );
}
