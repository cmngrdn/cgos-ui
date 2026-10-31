# Surfaces and atom CSS

The three surface tiers (glass, fill, pill), the widget contract, the inspector-body rule, and why an atom's resting state lives in its `.css` rather than an inline `style`. Loaded from `.claude/rules/surfaces.md`.

Moved out of `CLAUDE.md` on 2026-10-31 by audit pass 6 (Docs). The text is verbatim from the sections it replaced, except where a line is marked *(rewritten 2026-10-31)* because the code no longer matched it.

---

## An atom's resting state belongs in its companion CSS

- **AN ATOM'S RESTING STATE BELONGS IN ITS COMPANION CSS, NEVER IN AN INLINE `style` (v0.48.0, 2026-08-14).** A React `style` attribute beats every selector at every specificity, so an atom that styles itself inline **cannot be themed by a consumer at all** — which is not an override mechanism, it is the absence of one. Found in cmngrdn, whose inspector wanted its fields to read as editable text rather than as twenty bordered boxes: the consumer's rule matched the element, was the *only* matching rule for background / border-color / border-radius, and still lost. `!important` was the only door left, on an atom, in a design system.
  - **The shape:** static declarations go in `ui/<Atom>.css`, keyed off the `data-cg-*` attribute the element already carries. Variants become attributes a selector can see (`data-cg-size`), states become pseudo-classes (`:disabled`), and the `style` prop stays a per-instance escape hatch that still wins. `Button`/`[data-cg-button]` was always the model; `Input`/`Textarea` were converted to match.
  - **`style` as the documented override path is the smell.** `Input`'s own docblock used to offer it — "pass `style` to override per-instance" — which is true and which quietly meant no stylesheet could reach it. If you write that sentence, the atom is already wrong.
  - **This is NOT yet true across the package.** Audited 2026-08-14: of 29 atoms, only 8 have a companion CSS file (`Button` · `Composer` · `ControlChip` · `EntityChip` · `IconButton` · `Input` · `Select` · `Toggle`); the rest set their resting state inline, several heavily (`JourneySummaryCard` 21 blocks, `LinkedEntityCard` 19, `PulseSummaryCard` 19). **Converting them is a real project, not a sweep** — each needs its own verification against consumers, and this entry exists so the next person converting one knows the target shape rather than rediscovering it. **Convert an atom when a consumer actually needs to restyle it**; don't bulk-migrate untested.
  - **If a consumer reaches for `!important` against an atom, that is the ATOM's bug.** Fix it here and bump; don't leave the `!important` at the callsite.

## Surface tiers — glass, fill, pill

Three tiers, and depth is spent once. Reaching for a lower tier than you think you need is almost always right.

| Tier | What it is | Recipe | Where |
|---|---|---|---|
| **Glass** | The card. The thing that reads as lifted off the page. | `<GlassSurface>` — bg + blur + hairline + rim + elevation | Widgets, panels, popovers, drawers, sheets, top-level tiles |
| **Fill** | A block inside a card. | `--cg-fill` / `-hover` / `-strong`. No border, no blur, no shadow. | Rows, cells, grid tiles, stat blocks inside a widget |
| **Pill** | A label or small control. | Small radius + hairline + tint; may carry a border | Tags, chips, badges, counts, kbd, segment buttons |

**The widget contract.** A widget is ONE surface with many things inside it and its own controls — the iOS-widget model, and what `/studios` tiles, `<BloomIndex>` and the transmission audience picker all already do correctly. Two rules follow:

1. **One surface.** Everything inside is fill / pill / row. Nesting glass in glass makes both compete for the same "I am lifted" signal and neither wins — it reads as mush, which is exactly the note that produced this section.
2. **Sized, not grown.** A widget occupies its slot; more content scrolls or pages *inside* it. A "Show all N" that expands the widget and pushes its neighbours down is document behaviour, not widget behaviour — route it to a focused pullout instead. Give the widget its own header controls (filter / period / lens) rather than letting it get taller.

**THE RAIL IS THE CARD — so nothing inside an inspector body may be one (2026-08-15).** The same rule as the widget contract, applied to the surface it is easiest to forget about: an inspector is already glass, so everything in its body is fill or pill. Two atoms break this today and both should be fixed HERE rather than overridden per-consumer:

- **`<PulseSummaryCard>` composes `.cg-card-interactive`** — and by its own docblock it "lives inside an entity inspector's Details tab", i.e. its only home is the one place the tier forbids. Measured in cmngrdn's Dispatch rail: radius 16, an opaque `#181824` at 70%, a 1px border. That made it the loudest object in a body whose sections had just been flattened to bands, and it shipped that way on all TEN of its consumers. **`<JourneySummaryCard>` has the same chrome** and therefore the same defect, unmeasured only because it has fewer consumers.
- **The fix keeps the hover lift and the focus ring.** Those say "this is a door", which is true and is the card's only load-bearing behaviour. What goes is the claim to be a separate SURFACE: fill background, transparent border, radius down to 8, no shadow, no blur.
- **Interim state:** cmngrdn demotes both from `inspector-body.css` behind `NEXT_PUBLIC_HQ_INSPECTOR_BODY`, because that layer is flag-gated and reversible while the atom is shared with surfaces that have not adopted the standard. When every consumer is on it, move the recipe into the atoms and delete the override. **Do not add more class names to that override list** — a private module class that is secretly a card should be fixed at its own definition instead (cmngrdn's `.aud-card` is the worked example).

**The corollary for atom authors: an atom whose only home is inside another surface must be built for that surface.** If you find yourself writing a card because the component feels important, check where it actually renders first.
