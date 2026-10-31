# lib/activity — the activity vocabulary

One glyph, one tone and one default label per kind of event, for every surface that renders "what happened". Loaded from `.claude/rules/activity.md` when you touch `lib/activity.tsx`.

Moved out of `CLAUDE.md` on 2026-10-31 by audit pass 6 (Docs). The text is verbatim from the sections it replaced, except where a line is marked *(rewritten 2026-10-31)* because the code no longer matched it.

---

**One glyph, one tone and one default label per kind of thing that can happen.
No surface picks its own.** Added v0.49.0, extended v0.50.0.

Every consumer that renders "what happened" was inventing its own event →
(icon, colour) mapping. cmngrdn alone had two and they agreed on nothing — a
pass scan was a Unicode crosshair in one and a circled-dot in the other, and
one painted every event the same accent teal. A third surface would have made
a third.

- **The unit is an ACTION, not an `event_type`.** That string set is volatile:
  an audit found 14 types defined with zero rows AND 10 written in production
  with no def, drifting both directions at once. Binding the design system to
  it means a release every time an app adds an event. Apps map their own
  strings onto `ActivityKind`.
- **`label` is the ONLY overridable field.** The voice belongs to the surface
  — "You visited" on a member-facing feed, "Pass Scanned" on an operator one —
  the glyph and colour do not.
- **Tones are `var()`, never hexes.** A tone is the module that owns the
  action, EXCEPT where one module carries two media you must tell apart.
  Dispatch owns email and SMS; `--cg-channel-email` is lavender *(rewritten 2026-10-31: v0.90.0 moved it off blue)* and
  `--cg-channel-sms` is GREEN, borrowing the convention every phone already
  taught. Failures take STATUS tones — a bounce is a state, not a module.
- **`channelIcon` / `channelColor` / `channelGlyph`** for surfaces that aren't
  an activity row (a channel picker, a list thumb). Same fact, one resolution.
- **Phosphor is a PEER dependency — the package's first.** Optional and
  subpath-only, so a consumer that never imports activity never pulls it. Every
  other atom takes its icon as a prop or draws its own paths, but a vocabulary
  whose whole purpose is deciding the glyph once cannot hand it back.

**Adding to it:** map to an existing kind first. Add a KIND only when the
action is genuinely new, and never re-add a per-surface icon or colour.
