# Type and space — the UI scale (v0.85.0)

The rules every app interface follows for text size, spacing and density across desktop, tablet and phone. Tokens in `tokens.css`, role classes in `base.css`. Marketing type (`.cg-text-hero`, `.cg-text-display`, …) is a separate scale and is not covered here.

## Why

Measured on HQ (2026-10-22, ten screens, desktop + phone, ~13,000 text elements): **24 font sizes and 82 distinct text styles**, 43% of text under 12px (down to 7px), eight letter-spacing values on 10px text alone, six weights, mono on 17% of text; **52 spacing values** and 15+ row/control heights. Lists that should look alike didn't, and phone text was the same size as desktop text.

## Text: seven roles

| Role | Desktop / tablet | Phone (< 768px) | Weight | Line height | Letter-spacing | For |
|---|---|---|---|---|---|---|
| display | 28 | 26 | 600 | 1.1 | −0.02em | world names, page titles |
| title | 20 | 20 | 600 | 1.2 | −0.015em | panel titles |
| heading | 16 | 17 | 600 | 1.3 | −0.01em | card and section heads |
| body | 14 | 15 | 400 | 1.5 | 0 | reading text, row titles (at 600) |
| small | 13 | 14 | 400 | 1.4 | 0 | secondary lines |
| detail | 12 | 13 | 400 | 1.35 | +0.005em | times, meta, captions |
| label | 11 | 12 | 600 caps | 1.2 | +0.06em | section labels |

- **A role is a set.** Size, weight, line height and tracking are chosen together (`--cg-type-<role>-size|weight|lh|track`, or the `.cg-type-<role>` class). Never pick a size alone.
- **Tracking follows size**: tight on large text, zero on body, open on small capitals. One value for all sizes is always wrong somewhere.
- **Nothing below the label role.** 11px on desktop, 12px on a phone. A badge too small to hold that is too small to hold text.
- **One face.** Outfit everywhere; `--cg-font-figure` (mono, tabular) only for codes (`RQ-834-GVPEPN`), money and columns of figures — where every character must be read exactly or line up.
- **Weights: 400, 500, 600.** Emphasis by weight before size.

## Space: a 4-point grid and three proximity rules

`--cg-space-1` = 4px … `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-8` 32 · `-12` 48; `--cg-space-half` 2px for hairline nudges.

- `--cg-gap-inside` (4) — within one element: icon to its text, a label to its value.
- `--cg-gap-item` (8, 12 on touch) — between items in a group.
- `--cg-gap-group` (16) — between groups. Distance is the grouping: no divider where a gap says it.

## Density follows the pointer

`@media (pointer: coarse)` — a finger, on a phone **or a tablet** — sets `--cg-hit` to 44px (least size of anything pressable) and `--cg-row-min` to 52px. A mouse keeps 28 / 44. Text size follows the **width** (phone), density follows the **pointer** (touch): a tablet gets touch targets without phone-sized text.

## Adopting it

New UI uses the tokens or classes; no literal `font-size` in a consumer stylesheet. cmngrdn ratchets the remaining literals down (`scripts/audit-css-scale.mjs`).
