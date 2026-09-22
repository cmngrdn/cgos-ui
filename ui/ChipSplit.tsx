"use client";

import type { ReactNode } from "react";
import "./ChipSplit.css";

/**
 * ChipSplit — one chip shell, two halves (v0.71.0).
 *
 * The VALUE half says what is chosen and opens whatever holds the full choice
 * (a shelf, a menu). The MODIFIER half changes something about that value
 * without opening anything. Sort is the instance — "Date ⌄ | ↓" — but the
 * shape is any value + modifier pair.
 *
 * Why two halves rather than two chips: the thing you change OFTEN (direction)
 * is one click, and the thing you change RARELY (which field) sits behind the
 * caret. Two separate chips would read as two unrelated controls; one shell
 * with a hairline between the halves reads as one control you can grab in two
 * places. Shape from the list-chrome lab (cmngrdn `/lab/list-chrome`).
 *
 * Height is `--cg-control-h-chip`, so it sits in a `ToolsRow` at exactly the
 * height of the `ControlChip`s, `Input size="chip"` and `Button size="chip"`
 * beside it. Resting state lives in `ChipSplit.css`.
 *
 * Spec: docs/subsystems/tools-row-contract.md
 */

export interface ChipSplitProps {
  /** What is chosen now — "Date". */
  label: ReactNode;
  /** The value half was pressed — open the field list. */
  onOpen: () => void;
  /** Whether what `onOpen` opens is currently open. Drives `aria-expanded`. */
  open?: boolean;
  /** `id` of the shelf or menu the value half opens. */
  controls?: string;
  /** Hover text for the value half. */
  openTitle?: string;
  /** The modifier half's glyph — `<SortGlyph dir="desc" />` for sort. */
  modifier: ReactNode;
  /** Accessible name AND hover text for the modifier half. Say the STATE and
   *  what pressing does — "Descending — press for ascending". A lone arrow has
   *  no text of its own. */
  modifierLabel: string;
  onModifier: () => void;
}

export function ChipSplit({
  label,
  onOpen,
  open,
  controls,
  openTitle,
  modifier,
  modifierLabel,
  onModifier,
}: ChipSplitProps) {
  return (
    <span data-cg-chip-split="" {...(open ? { "data-open": "" } : {})}>
      <button
        type="button"
        data-cg-chip-split-value=""
        onClick={onOpen}
        aria-expanded={open}
        aria-controls={controls}
        title={openTitle}
      >
        <span data-cg-chip-split-label="">{label}</span>
        <svg
          aria-hidden="true"
          width="9"
          height="9"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="3,5 6,8 9,5" />
        </svg>
      </button>
      <button
        type="button"
        data-cg-chip-split-modifier=""
        onClick={onModifier}
        aria-label={modifierLabel}
        title={modifierLabel}
      >
        {modifier}
      </button>
    </span>
  );
}

/** The direction arrow for a sort `ChipSplit`. Drawn here rather than taken
 *  from an icon set so the atom has no icon dependency. */
export function SortGlyph({ dir }: { dir: "asc" | "desc" }) {
  return (
    <svg
      aria-hidden="true"
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "asc" ? (
        <>
          <line x1="6" y1="10" x2="6" y2="2.5" />
          <polyline points="2.75,5.5 6,2.25 9.25,5.5" />
        </>
      ) : (
        <>
          <line x1="6" y1="2" x2="6" y2="9.5" />
          <polyline points="2.75,6.5 6,9.75 9.25,6.5" />
        </>
      )}
    </svg>
  );
}
