/**
 * Motion scale — the JS-readable mirror of the motion tokens in
 * `cgos-ui/tokens.css` (the `--cg-duration-*` / `--cg-ease-*` block).
 *
 * Single source of truth for animation timing across the design system.
 * CSS-driven atoms read the custom properties directly; JS-driven motion
 * (framer-motion tweens/springs, imperative `element.animate()`,
 * `requestAnimationFrame` choreography) reads from here so the two never
 * drift. The `tokens.css` comment points at this file — keep the numbers
 * in lockstep with that block when either side changes.
 *
 * Timing model follows Apple HIG: motion splits into ENTRY (decelerate-in,
 * an element appearing) and EXIT (accelerate-out, an element dismissing).
 * `emphasize` is the HIG-style over-and-settle for hero moments.
 *
 * Three shapes for each value so every consumer style gets a clean import:
 *  - `duration`      → milliseconds as a number   (framer, JS timers, rAF)
 *  - `durationCss`   → the CSS string ("400ms")    (inline styles)
 *  - `ease`          → cubic-bezier as `[x1,y1,x2,y2]` (framer's `ease`)
 *  - `easeCss`       → the `cubic-bezier(...)` string (inline `transition`)
 *  - `spring`        → framer-motion `transition` presets (physics motion)
 *
 * Reduced motion is NOT encoded here — it's a per-surface decision. Gate on
 * `prefers-reduced-motion` at the callsite (the CSS atoms do it in
 * `base.css`; JS consumers use their own `useReducedMotion`) and collapse
 * to `duration.instant` / no transform.
 */

/** Animation durations, milliseconds. Mirrors `--cg-duration-*`. */
export const duration = {
  /** Reduced-motion / no-animation sentinel. */
  instant: 0,
  /** Micro-feedback: press-state, toggles, hovers. `--cg-duration-fast`. */
  fast: 150,
  /** Default UI transition: most enter/exit, tabs, popovers. `--cg-duration-base`. */
  base: 220,
  /** Deliberate: modals, drawers, scroll-reveal. `--cg-duration-slow`. */
  slow: 400,
  /** Grand: full-page / hero choreography. `--cg-duration-slower`. */
  slower: 600,
} as const;

export type DurationKey = keyof typeof duration;

/** Same scale as CSS strings, for inline `transition` / `animation`. */
export const durationCss: Record<DurationKey, string> = {
  instant: "0ms",
  fast: "150ms",
  base: "220ms",
  slow: "400ms",
  slower: "600ms",
};

/**
 * Easing curves as cubic-bezier control points `[x1, y1, x2, y2]`.
 * framer-motion accepts this tuple directly as its `ease`. Mirrors
 * `--cg-ease-*`.
 */
export const ease = {
  /** Legacy ease-in-out — symmetric. `--cg-ease`. Prefer entry/exit below. */
  inOut: [0.4, 0, 0.2, 1],
  /** Decelerate-in — the HIG "appear" curve. `--cg-ease-entry`. */
  entry: [0, 0, 0.2, 1],
  /** Accelerate-out — the HIG "dismiss" curve. `--cg-ease-exit`. */
  exit: [0.4, 0, 1, 1],
  /** Emphasized over-and-settle for hero moments. `--cg-ease-emphasize`. */
  emphasize: [0.2, 0, 0, 1],
} as const satisfies Record<string, [number, number, number, number]>;

export type EaseKey = keyof typeof ease;

/** Same curves as `cubic-bezier(...)` strings, for inline styles. */
export const easeCss: Record<EaseKey, string> = {
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  entry: "cubic-bezier(0, 0, 0.2, 1)",
  exit: "cubic-bezier(0.4, 0, 1, 1)",
  emphasize: "cubic-bezier(0.2, 0, 0, 1)",
};

/**
 * framer-motion spring presets. The `tokens.css` motion comment references
 * springs "for framer-motion consumers" — this is that reference, made
 * concrete. Spread into a `transition` prop: `transition={spring.gentle}`.
 */
export const spring = {
  /** Soft settle, no visible overshoot — panels, drawers. */
  gentle: { type: "spring", stiffness: 260, damping: 32 },
  /** A touch of bounce — chips, badges, playful UI. */
  bouncy: { type: "spring", stiffness: 380, damping: 22 },
  /** Snappy and near-critically-damped — buttons, quick toggles. */
  snappy: { type: "spring", stiffness: 520, damping: 34 },
} as const;

export type SpringKey = keyof typeof spring;

/**
 * Convenience: a ready-made CSS `transition` shorthand string for one or
 * more properties, using the token scale. Defaults to the `base`/`entry`
 * pairing (the system's everyday transition).
 *
 *   transition: cssTransition("opacity", "transform")           // base/entry
 *   transition: cssTransition(["opacity"], { d: "slow", e: "exit" })
 */
export function cssTransition(
  properties: string | string[],
  opts: { d?: DurationKey; e?: EaseKey; delayMs?: number } = {},
): string {
  const { d = "base", e = "entry", delayMs = 0 } = opts;
  const props = Array.isArray(properties) ? properties : [properties];
  const timing = `${durationCss[d]} ${easeCss[e]}${delayMs ? ` ${delayMs}ms` : ""}`;
  return props.map((p) => `${p} ${timing}`).join(", ");
}
