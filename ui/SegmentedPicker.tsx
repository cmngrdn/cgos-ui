"use client";

/**
 * ONE CONTROL FOR EVERY "PICK EXACTLY ONE" ROW.
 *
 * The crew inspector had three of these stacked — crew status, call-list tier,
 * and (before it became switches) ADP — and each was its own hand-rolled
 * `<ChipGroup>`. They sat 40px apart looking like three different kinds of
 * decision when they are the same kind: an ordered or fixed set, one of which
 * is true. The add-to-crew dialog then made a fourth. This is the control they
 * all use.
 *
 * ## What it adds over a chip row
 *
 * A chip row says "these five options are interchangeable". These sets are
 * not: A–D is an ORDERED ladder, Z is off the ladder entirely, and Active /
 * Inactive is a state with consequences. So the rungs are JOINED into one
 * track rather than floating as separate pills — a shared edge reads as a
 * selector, gaps read as tags — and each option can carry a `tone` that makes
 * its meaning legible before the label is read.
 *
 * The tones come from the domain, never from here. The call list uses
 * Airtable's own `List` colours (A green · B cyan · C amber · D red · Z grey)
 * so the control reads the way the base the schedulers have used for years
 * already does.
 *
 * ## Keyboard
 *
 * A real radiogroup: one tab stop for the whole track, arrows move and commit,
 * Home/End jump to the ends. Roving tabindex, so tabbing past does not walk
 * through six separate stops.
 *
 * ## Hoisted from cmngrdn 2026-09-19 — its own docblock called for it
 *
 * It arrived here as a verbatim move: same markup, same class names, same
 * stylesheet, so "the crew inspector cannot shift by a pixel" is provable by
 * measurement rather than by review. The `sgp-` prefix is kept for that reason
 * and is not a naming slip — renaming it in the same change would be a restyle
 * wearing a refactor's clothes, which is the rule `InspectorSection` and
 * `InspectorFields` both already follow.
 *
 * ## What is NOT here, and must not be added
 *
 * The OPTION SETS. Which rungs the call list has, what each one means and what
 * colour it carries are AHLC's facts, and they live in cmngrdn's
 * `lib/crew/tags.ts` (`TIER_META`) with a thin `<CallListPicker>` wrapper over
 * this. A design system that knew what "call-list tier B" was would be holding
 * one tenant's vocabulary.
 *
 * That split is also the fix for a real bug: the crew roster rendered every
 * tier as one hardcoded `Badge tone="info"` while the picker read `TIER_META`,
 * so one tier was two colours on two screens. One exported map, consumed by
 * both, cannot disagree with itself.
 *
 * ## `token` is a custom-property NAME, not a colour
 *
 * `token: '--cg-status-green'`, never `'#2dd4a8'`. The consumer names a token
 * and this sets `--sgp-tone` from it, so a theme change reaches the control and
 * no hex ever enters a style prop — the hard rule every consumer is reviewed
 * against.
 */

import { useCallback, useMemo, useRef } from "react";

import "./SegmentedPicker.css";

export interface SegmentedOption<T extends string> {
  value: T;
  /** What renders on the face. Keep it short — this is a track, not a menu. */
  label: string;
  /** Longer form for the tooltip and the accessible name. The face of a
   *  one-letter option says nothing on its own, and a caption under it would
   *  double the control's height to repeat what a hover already gives. */
  hint?: string;
  /** A `--cg-*` custom-property NAME (not a value) for this option's tone. */
  token?: string;
}

export interface SegmentedPickerProps<T extends string> {
  value: T | null;
  onChange: (next: T | null) => void;
  options: readonly SegmentedOption<T>[];
  /** Offer an explicit "none". Some sets have a real empty state that has to
   *  be choosable — an unranked crew member is read differently by dispatch
   *  from a low-ranked one — and some do not. */
  allowNone?: boolean;
  noneLabel?: string;
  noneHint?: string;
  disabled?: boolean;
  ariaLabel: string;
}

export function SegmentedPicker<T extends string>({
  value,
  onChange,
  options,
  allowNone = false,
  noneLabel = "None",
  noneHint,
  disabled = false,
  ariaLabel,
}: SegmentedPickerProps<T>) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const cells = useMemo<(SegmentedOption<T> | null)[]>(
    () => (allowNone ? [null, ...options] : [...options]),
    [allowNone, options],
  );

  const move = useCallback(
    (delta: number | "home" | "end") => {
      const i = cells.findIndex((c) => (c?.value ?? null) === value);
      const next =
        delta === "home"
          ? 0
          : delta === "end"
            ? cells.length - 1
            : // An unset value sits BEFORE the first cell, so →/↓ from nothing
              // lands on the first option rather than skipping to the second.
              Math.min(Math.max((i < 0 ? -1 : i) + delta, 0), cells.length - 1);
      onChange(cells[next]?.value ?? null);
      // Follow the selection so the browser scrolls it into view and a screen
      // reader announces the new cell rather than the old one.
      wrapRef.current
        ?.querySelectorAll<HTMLElement>("[role='radio']")
        [next]?.focus();
    },
    [cells, value, onChange],
  );

  return (
    <div
      ref={wrapRef}
      className="sgp"
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onKeyDown={(e) => {
        if (disabled) return;
        const k = e.key;
        if (k === "ArrowRight" || k === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (k === "ArrowLeft" || k === "ArrowUp") {
          e.preventDefault();
          move(-1);
        } else if (k === "Home") {
          e.preventDefault();
          move("home");
        } else if (k === "End") {
          e.preventDefault();
          move("end");
        }
      }}
    >
      {cells.map((c) => {
        const v = c?.value ?? null;
        const active = value === v;
        const label = c?.label ?? noneLabel;
        const hint = c?.hint ?? noneHint;
        return (
          <button
            key={v ?? "__none"}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            // Roving tabindex — one stop for the whole track. With nothing
            // set, the first cell holds it so the group stays reachable.
            tabIndex={active || (value === null && c === cells[0]) ? 0 : -1}
            className="sgp-cell"
            data-active={active || undefined}
            data-none={c === null || undefined}
            // eslint-disable-next-line no-restricted-syntax -- theme-driven toggle: the only inline style is the per-option `--sgp-tone`, which the domain supplies and a stylesheet cannot express per-instance. Every other visual lives in segmented-picker.css.
            style={
              c?.token
                ? ({ "--sgp-tone": `var(${c.token})` } as React.CSSProperties)
                : undefined
            }
            onClick={() => onChange(v)}
            title={hint ? `${label} — ${hint}` : label}
            aria-label={hint ? `${label} — ${hint}` : label}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
