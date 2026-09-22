"use client";

import "./ChipApplied.css";

/**
 * ChipApplied — one filter that is narrowing the list, removable in place
 * (v0.71.0).
 *
 * The readout that makes folding filters onto a shelf SAFE rather than merely
 * tidy. The Filter control's badge says HOW MANY filters are on; these say
 * WHICH, beside the search box, and let you drop one without opening anything.
 * A `ToolsRow` renders them in its `applied` slot, which is absent when nothing
 * is filtering — so the bar is quiet by default.
 *
 * The whole chip is the remove button (the × is its glyph, not a separate
 * target), because the only thing you can do to an applied filter from here is
 * take it off.
 *
 * ONE HEIGHT: it is `--cg-control-h-chip` like everything else in the bar. The
 * lab drew these 6px shorter as tokens-inside-the-bar; they are controls, and
 * the bar's rule is one control height, so they are not an exception to it.
 *
 * Spec: docs/subsystems/tools-row-contract.md
 */

export interface ChipAppliedProps {
  /** The filter value as the list shows it — "Unread". */
  label: string;
  /** Which dimension it belongs to — "Status". Folded into the accessible name
   *  and hover text; not drawn, because the bar has no room for it. */
  group?: string;
  onRemove: () => void;
}

export function ChipApplied({ label, group, onRemove }: ChipAppliedProps) {
  const name = `Remove filter ${group ? `${group}: ` : ""}${label}`;
  return (
    <button type="button" data-cg-chip-applied="" onClick={onRemove} aria-label={name} title={name}>
      <span data-cg-chip-applied-label="">{label}</span>
      <svg
        aria-hidden="true"
        width="8"
        height="8"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <line x1="2" y1="2" x2="8" y2="8" />
        <line x1="8" y1="2" x2="2" y2="8" />
      </svg>
    </button>
  );
}

/** "Clear all" — drops every applied filter. Render it only when two or more
 *  are on; with one, that chip's own × already does this. */
export function ChipAppliedClear({ onClear, label = "Clear all" }: { onClear: () => void; label?: string }) {
  return (
    <button type="button" data-cg-chip-applied-clear="" onClick={onClear}>
      {label}
    </button>
  );
}
