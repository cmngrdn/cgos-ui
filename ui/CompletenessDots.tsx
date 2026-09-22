"use client";

/**
 * CompletenessDots — row of dots showing field-completion state.
 *
 * HOISTED from cmngrdn `src/components/hq/shared/CompletenessDots.tsx` in
 * v0.71.0, because `UniversalListRow` and `UniversalTile` draw their progress
 * anchor with it and could not move here without it. Originally a port of the
 * cgos dashboard's. Used on:
 *   - Asset + Project cards (UnifiedCard / CardListRow) in /hq/library/*
 *   - Asset/Project inspector header bar (size 7, with "Next: <label>" nudge)
 *
 * Visual: row of `total` dots, first `score` are lit (accent + 4px glow),
 * rest are dim. 200ms fill transition on change. `role="progressbar"` +
 * ARIA value attrs + aria-label.
 *
 * Hover tooltip: when `fields` is set AND ≥1 field is unfilled, hovering
 * the dot cluster surfaces a tooltip 6px above showing "MISSING" header
 * + label of each unfilled field. Pure visual — `pointerEvents: 'none'`.
 *
 * NO click handler — display + hover-tooltip only.
 *
 * ── ONE DOT PER UNIT STOPS BEING A METER SOMEWHERE ─────────────────────────
 *
 * This was written for field completion, where `total` is the number of fields
 * on a form — nine at the outside. The staffing schedule then reused it for a
 * HEADCOUNT, and a headcount has no such ceiling: AHLC's peak day is 180 slots
 * on one show. 180 dots is 1,668px wide, it does not wrap, and measured at
 * 375px it gave the schedule **1,319px of horizontal overflow** — the page
 * scrolled sideways on a phone.
 *
 * Past `DOT_LIMIT` the same fact is drawn as a proportional bar instead. Not
 * only because the dots overflow: nobody counts past about a dozen, so beyond
 * that the dots have already stopped being readable as a quantity and are
 * costing width to say something a bar says better. Everything else — the
 * role, the ARIA values, the label, the tooltip — is identical, so a caller
 * cannot tell which it will get and does not have to care.
 */

/** Above this, dots become a bar. Chosen so every field-completion caller
 *  (≤9) keeps the exact rendering it has today. */
const DOT_LIMIT = 12

import { useState, type CSSProperties } from "react";

export interface CompletenessField {
  key: string;
  label: string;
  filled: boolean;
}

export interface CompletenessDotsProps {
  score: number;
  total: number;
  size?: number;
  gap?: number;
  /** Per-token accent color. Falls back to `--cg-accent`. */
  accent?: string;
  /** When set, enables hover tooltip showing unfilled field labels. */
  fields?: CompletenessField[];
  /** What the dots are counting, for the accessible label — "3 of 9 staffed".
   *  Defaults to the Library's own reading, which is where this started and
   *  is still most of its callers; a screen reader on the staffing schedule
   *  was otherwise told a call was "1 of 4 library-ready". */
  countingLabel?: string;
}

export function CompletenessDots({
  score,
  total,
  size = 5,
  gap = 4,
  accent,
  fields,
  countingLabel = "library-ready",
}: CompletenessDotsProps) {
  const [hovered, setHovered] = useState(false);
  if (total <= 0) return null;

  const accentColor = accent ?? "var(--cg-accent)";
  // The glow used to be `${accentColor}66` — a hex-alpha suffix. That works on
  // a hex accent and produces an INVALID shadow on `var(--cg-accent)`, so the
  // default dots never glowed and nobody could see why. `color-mix` is the same
  // 40% on a hex and is valid on a var. Kept to an explicit accent so the
  // default dots render exactly as they always have.
  const glow = accent ? `color-mix(in srgb, ${accent} 40%, transparent)` : null;
  const unfilled = fields?.filter((f) => !f.filled) ?? [];
  const showTooltip = hovered && unfilled.length > 0;

  const containerStyle: CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap,
  };

  return (
    <div
      style={containerStyle}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${score} of ${total} ${countingLabel}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {total > DOT_LIMIT ? (
        /* One bar, fixed width, same meaning. `flexShrink: 0` because this
           sits in a flex header that would otherwise squeeze it to nothing. */
        <span
          style={{
            width: 48,
            height: size,
            borderRadius: size,
            background: "var(--cg-border)",
            overflow: "hidden",
            display: "inline-block",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              display: "block",
              width: `${Math.round((Math.min(score, total) / total) * 100)}%`,
              height: "100%",
              borderRadius: size,
              background: accentColor,
              boxShadow: score > 0 && glow ? `0 0 4px ${glow}` : "none",
              transition: "width 200ms",
            }}
          />
        </span>
      ) : (
        Array.from({ length: total }).map((_, i) => {
          const isLit = i < score;
          return (
            <span
              key={i}
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: isLit ? accentColor : "var(--cg-border)",
                boxShadow: isLit && glow ? `0 0 4px ${glow}` : "none",
                transition: "background 200ms",
                display: "inline-block",
              }}
            />
          );
        })
      )}
      {showTooltip && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: `calc(100% + 6px)`,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 10px",
            borderRadius: 6,
            background: "var(--cg-bg-elevated)",
            border: "1px solid var(--cg-border)",
            boxShadow: "var(--cg-elev-2)",
            pointerEvents: "none",
            zIndex: 100,
            minWidth: 140,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--cg-text-muted)",
              fontFamily: "var(--cg-font-mono, monospace)",
            }}
          >
            Missing
          </span>
          {unfilled.map((f) => (
            <span key={f.key} style={{ fontSize: 12, color: "var(--cg-text)" }}>
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
