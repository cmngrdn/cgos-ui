# Package exports

`package.json` lists every subpath explicitly, so a file is only importable once the exports map names it. Loaded from `.claude/rules/package-exports.md`.

Moved out of `CLAUDE.md` on 2026-10-31 by audit pass 6 (Docs). The text is verbatim from the sections it replaced, except where a line is marked *(rewritten 2026-10-31)* because the code no longer matched it.

---

## A new atom is not reachable until it is in `exports`

0. **A NEW ATOM IS NOT REACHABLE UNTIL IT IS IN `exports`.** `package.json` lists every
   subpath explicitly (`"./ui/Button"`, `"./ui/Button.css"`, …), so a file added under `ui/`
   and shipped in a tagged release still fails to resolve in every consumer:
   `TS2307: Cannot find module 'cgos-ui/ui/X'`. The file is present, this repo has no build to
   fail, and the breakage appears only in a consumer AFTER the tag has been cut and pinned —
   the most expensive possible place to find a one-line omission. `TagListField` shipped in
   v0.51.0 that way and needed v0.51.1 the same minute. **Add the atom AND its companion `.css`
   to `exports` in the same commit as the file.**

   **`npm run audit:exports` now enforces this**, in CI on every push and PR
   (`.github/workflows/exports.yml` — pure node, no install, ~1s). It checks both directions:
   an atom with no entry, an entry pointing at the wrong file, and an entry pointing at a file
   that no longer exists. Verified against the known-bad case rather than trusted on a green
   tick — remove `TagListField` from the map and it fails with the exact message a consumer
   would have hit.

## The same holds for `lib/`

- ⚠️ **A `lib/` module is unreachable until the EXPORTS MAP names it, exactly like a `ui/` atom — and `audit:exports` only checked one direction until v0.54.1.** It verified that every map ENTRY resolves to a file, never that every MODULE has an entry, so `lib/sms-body.ts` shipped in a tagged v0.54.0, passed the audit, and still failed in the consumer with `Cannot find module 'cgos-ui/lib/sms-body'`. The audit now checks both directions for `lib/` as it already did for `ui/` (`.tsx` counts — `lib/activity.tsx` is a lib module that renders). Same failure the atom section above describes; it just had a second door nobody had shut.
