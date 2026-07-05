"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Reveal — a below-the-fold entrance animation that settles as its block
 * scrolls into view. Dependency-free (no framer): one IntersectionObserver
 * per block + a CSS transition on the token motion scale
 * (`--cg-duration-slow` / `--cg-ease-entry`), so lean public pages stay
 * lean. Graduated into cgos-ui from cmngrdn (exp-hardening Wave 0) so every
 * front door shares one reveal grammar instead of forking it.
 *
 * Progressive enhancement, three ways:
 *  - No JS  → carries the `.cg-reveal` class; consumers ship a one-line
 *             `<noscript>` guard (`.cg-reveal{opacity:1!important;transform:none!important}`)
 *             so content is never trapped at opacity 0. (See CLAUDE.md.)
 *  - Reduced motion → resolves visible immediately, no transform, no
 *             transition (the JS path here + the `base.css` `.cg-reveal`
 *             guard, belt-and-suspenders).
 *  - Otherwise → starts translated + transparent, settles once it enters
 *             the viewport (observer fires once, then disconnects). A
 *             backstop timer guarantees it can never stay hidden.
 *
 * Only wrap content that begins BELOW the fold. Above-fold blocks fade up
 * on mount, which reads as a gentle intro rather than a flash.
 */

export interface RevealProps {
  children: ReactNode;
  /** Stagger position — delay = index * step (ms). Default 0. */
  index?: number;
  /** Per-index delay unit, ms. Default 70. */
  step?: number;
  /** Upward travel distance while hidden, px. Default 14. */
  distance?: number;
  className?: string;
  style?: CSSProperties;
}

interface RevealState {
  shown: boolean;
  /** Reveal with no transition (reduced-motion) — appear, don't animate. */
  instant: boolean;
}

const HIDDEN: RevealState = { shown: false, instant: false };

export function Reveal({
  children,
  index = 0,
  step = 70,
  distance = 14,
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<RevealState>(HIDDEN);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = !!window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Reduced motion, or already at/near the fold on mount → reveal on the
    // next frame (deferred so we never setState synchronously in the effect
    // body). The near-fold check also covers browsers that don't emit an
    // initial observer callback for on-screen nodes.
    const near =
      el.getBoundingClientRect().top < (window.innerHeight || 0) * 1.1;
    if (reduce || near) {
      const raf = requestAnimationFrame(() =>
        setState({ shown: true, instant: reduce }),
      );
      return () => cancelAnimationFrame(raf);
    }

    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            setState({ shown: true, instant: false });
            io?.disconnect();
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
      );
      io.observe(el);
    }

    // Absolute backstop: content must never stay stuck at opacity 0, even if
    // the observer never fires (odd viewports, disconnected roots, etc.).
    const backstop = window.setTimeout(
      () => setState({ shown: true, instant: false }),
      2500,
    );

    return () => {
      io?.disconnect();
      window.clearTimeout(backstop);
    };
  }, []);

  const { shown, instant } = state;
  const timing =
    "var(--cg-duration-slow, 400ms) var(--cg-ease-entry, cubic-bezier(0, 0, 0.2, 1))";
  const delay = shown ? `${index * step}ms` : "0ms";

  return (
    <div
      ref={ref}
      className={className ? `cg-reveal ${className}` : "cg-reveal"}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown || instant ? "none" : `translateY(${distance}px)`,
        transition: instant
          ? "none"
          : `opacity ${timing} ${delay}, transform ${timing} ${delay}`,
        willChange: shown ? undefined : "opacity, transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
