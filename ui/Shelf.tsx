"use client";

import type { ReactNode } from "react";
import "./Shelf.css";

/**
 * Shelf — a strip a `ToolsRow` opens beneath itself (v0.71.0).
 *
 * Everything above a list used to be a STACK of always-on strips — analytics,
 * filters, a chip row, a bulk bar — each costing its height whether or not you
 * were using it; measured at 28% of the Inquiries module. The bar model keeps
 * exactly one permanent row and turns the rest into shelves. A shut shelf costs
 * only the control that opens it.
 *
 * Animates to CONTENT height with no JS measurement: `grid-template-rows: 0fr →
 * 1fr`, with `min-height: 0` on the inner wrapper (load-bearing — without it the
 * shelf never closes). A shut shelf is `inert`, so nothing on it can be tabbed
 * to or read out while it has no height.
 *
 * Exports:
 *  - `Shelf`       — the disclosure itself.
 *  - `ShelfToggle` — the bar control that opens one. ⚠️ It REQUIRES a readout
 *                    (`badge` or `readout`) at the type level, because a shut
 *                    shelf must still say something: folding a thing away
 *                    without leaving a number is a regression, not a saving.
 *  - `ShelfGroup`  — a labelled cluster inside a shelf (`STATUS` · `FORM`).
 *
 * Sort is opened by a `ChipSplit`, not a `ShelfToggle` — its readout is the
 * chosen field, which the split already shows.
 *
 * Spec: docs/subsystems/tools-row-contract.md
 */

export interface ShelfProps {
  open: boolean;
  /** Referenced by the opening control's `aria-controls`. */
  id?: string;
  /** Names the region for assistive tech — "Filters", "Sort by". */
  label: string;
  /**
   * `row` (default) — a row of controls, at least one bar tall, wraps.
   * `panel` — free height, for content that is not controls (the Pulse chart
   * grid). The one shelf allowed to open taller than the bar says so here
   * rather than in a consumer override.
   */
  variant?: "row" | "panel";
  /**
   * `selection` — the elevated tone for the bulk-action shelf. That shelf has
   * NO toggle: it opens because rows are selected, the single case where the
   * interface should decide, because the condition is unambiguous and the shelf
   * is useless outside it.
   */
  tone?: "default" | "selection";
  children: ReactNode;
}

export function Shelf({ open, id, label, variant = "row", tone = "default", children }: ShelfProps) {
  return (
    <div
      data-cg-shelf=""
      data-variant={variant}
      data-tone={tone}
      {...(open ? { "data-open": "" } : {})}
      id={id}
      role="region"
      aria-label={label}
      inert={!open}
    >
      <div data-cg-shelf-inner="">
        <div data-cg-shelf-body="">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

interface ShelfToggleBase {
  label: string;
  /** A 13px glyph before the label. The atom draws none of its own. */
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** `id` of the `Shelf` this opens. */
  controls?: string;
}

/**
 * A SHUT SHELF MUST STILL SAY SOMETHING — so one of these is required.
 *  - `badge`   — a count, drawn as an accent pill, hidden at 0 (Filter: how many
 *                are on; nothing on means nothing to say).
 *  - `readout` — a live value in the mono voice, always shown (Pulse: 1,804).
 */
export type ShelfToggleProps = ShelfToggleBase &
  ({ badge: number; readout?: never } | { readout: ReactNode; badge?: never });

export function ShelfToggle({ label, icon, open, onToggle, controls, badge, readout }: ShelfToggleProps) {
  return (
    <button
      type="button"
      data-cg-shelf-toggle=""
      {...(open ? { "data-open": "" } : {})}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
    >
      {icon && <span data-cg-shelf-toggle-icon="">{icon}</span>}
      {label}
      {badge !== undefined && badge > 0 && (
        <span data-cg-shelf-toggle-badge="" aria-label={`${badge} active`}>
          {badge}
        </span>
      )}
      {readout !== undefined && <span data-cg-shelf-toggle-readout="">{readout}</span>}
    </button>
  );
}

/**
 * THE TWO STANDARD SHELF CONTROLS (v0.72.0). Every list's Filter button and
 * every list's Pulse button are these — same word, same glyph, same readout
 * rule — so no surface can ship its own. v0.71.0 left the glyph to the caller
 * and four surfaces shipped a Filter with no funnel beside one with it.
 */
export function FilterToggle(props: Omit<ShelfToggleBase, "label" | "icon"> & { badge: number }) {
  return <ShelfToggle {...props} label="Filter" icon={<FunnelGlyph />} />;
}

export function PulseToggle(props: Omit<ShelfToggleBase, "label" | "icon"> & { readout: ReactNode }) {
  return <ShelfToggle {...props} label="Pulse" icon={<PulseGlyph />} />;
}

function FunnelGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5z" />
    </svg>
  );
}

function PulseGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1.5,9 4.5,9 6.5,4 9.5,12 11.5,7 14.5,7" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────

/** A labelled cluster on a shelf. Each filter dimension keeps its NAME, which
 *  is what a chip's own dropdown label used to carry. */
export function ShelfGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span data-cg-shelf-group="" role="group" aria-label={label}>
      <span data-cg-shelf-group-label="" aria-hidden="true">
        {label}
      </span>
      {children}
    </span>
  );
}
