<!-- ONE closedown for every Common Garden repo. This file is byte-identical in each repo's
.claude/commands/closedown.md; the source copy is cgos's, and `scripts/check-repo-standard.py`
flags any repo whose copy differs. Change it in cgos, then `python3 scripts/sync-closedown.py`.
What differs between repos is never a different procedure — it is a condition below
("if this repo has …"), or a fact in that repo's own CLAUDE.md. -->

Close down this session so every record it touched is true. Most steps are *check, fix what is wrong, skip if nothing changed* — a doc commit with no real change is worse than none. Run each step only if this repo has the thing it names.

1. **Route what this session learned to the file that owns it — never by appending to the file you have open.** If `CLAUDE.md` has a § *Where things go* table, follow it. Otherwise:
   - a decision (why the system is shaped this way) → `docs/architecture.md` if the repo has one;
   - how one subsystem works → `docs/subsystems/<slug>.md`;
   - a lesson from an incident or a measurement → `docs/patterns.md` (or its topic file under `docs/patterns/`, then `python3 scripts/check-patterns-index.py --write` if the repo has it), in the why + how-to-apply shape. **Most of what a session learns is this kind;**
   - a rule an *arbitrary* session in this repo must follow → one line in `CLAUDE.md`, with no history and no dates of past fixes;
   - a fact the code holds (a list, a count, a version) → nowhere; it is generated, or grep answers it.

   Then **remove what this session proved untrue**, in whichever doc said it. `CLAUDE.md` may shrink or hold; adding a line there means something else leaves.

2. **Fold finished plans.** A plan doc this session finished: move its lasting reasoning — the *why*, not the build log — into `docs/architecture.md` or its subsystem doc, move the plan to `docs/_archive/` and fix the links that point at it. Every plan in any repo has one row in cgos `docs/doc-map.md`: set its Status (**PROPOSED · ACTIVE · PAUSED · REFERENCE · CANON · GENERATED · LOG · DONE · SUPERSEDED**), or replace the row with a line under § Archived once archived. A plan this session started gets a row now. In cgos, `python3 scripts/check-doc-map.py --stale` lists finished plans still waiting. A fact in a main doc that changed gets the test or generator that holds it, or the date you verified it.

3. **The work tracker — verify, don't read.** An item is done when the thing it asks for EXISTS (a table, a module, a route, a config line, a green health field): check that, never the plan doc or the item's own wording.
   - **cgos task board** (`scripts/task_bus.py`): `python3 scripts/task_bus.py list --open`; for each row this session finished, `python3 scripts/task_bus.py resolve <id> --note "<commit ref>"`. Over the API only, never by opening `knowledge/chat_history.db`. Titles only; if a title is ambiguous, leave the row.
   - **GitHub Issues** (a repo whose `CLAUDE.md` says its board is Issues): close what is done with the PR that did it, comment on partial work, open newly found work.
   - **cgos `SCOPE.md`**: a row that shipped this session leaves *Active* / *Next up* / *Ideas* and gets one line under *Recently shipped* (one line each, last 60 days). A build whose only remaining step is a human walk-through moves to *Awaiting Feather*. Check every *Next up* row against live state — built work is often never moved.
   - **cgos routine snapshots** (`docs/*-latest.json`): for each finding this session fixed, set its own `status` to `resolved_post_capture` with a `resolved_in` note, AND add its id to `resolved_findings` — both, or the morning brief keeps surfacing it.

4. **`OPS.md`** (cgos — Feather's daily ledger). Update only the *Active Threads* this session touched: tick what shipped, correct a `Status` line now wrong, add what is newly outstanding. Never rewrite a thread you have no evidence about, never invent or move a date, never touch refresh stamps or `[unrefreshed]` markers. Find what Feather said that the record lacks with `src/unwritten.py` — it quotes his words verbatim; select among the quotes, never summarise them:

   ```
   python3 -c "import sys; sys.path.insert(0,'src'); import unwritten, pathlib; \
   docs=pathlib.Path('OPS.md').read_text()+pathlib.Path('SCOPE.md').read_text(); \
   [print(f'{u.said_on}  {u.text.strip()[:160]}') for u in unwritten.find_unwritten(docs, since_days=2)]"
   ```

   If nothing a thread describes changed, skip this step.

5. **`CONTEXT.md` = current state**, read from the live system, not recalled: what is live, what is in flight and what it waits on, the last 2–3 things completed (one line each), the *Last updated* date. Correct any claim this session disproved, with a dated note. Quote Feather's decisions with their date; never paraphrase them, and never rewrite a section this session has no evidence about. **A Drive workspace, project or Identity bed the session touched** closes down by the Common Garden drive's own `Knowledge/Workflows/closedown.md` (the drive root's `CLAUDE.md` links it) — the same idea for the other kind of place (Blueprint §11–§12).

6. **Cross-repo.** If this session changed something another repo reads (Supabase schema, a route, a shared type, a collector's payload, a cgos-ui pin), name the repos whose `CLAUDE.md` or docs now need a change, and make it or list it.

7. **Live state.** If `CLAUDE.md` names a health check or a service for this repo, run it and confirm it reports the commit on `origin/main`; if `main` moved and nothing redeployed, say so. Never restart or deploy as part of closedown — a restart can strand in-flight work. In cgos, if the session changed anything `docs/state-of-system.md` reports, run `python3 scripts/publish_state_of_system.py` (it refuses any target not recorded as generated).

8. **Secrets and leftovers.** `git status`: no `.env` variant staged, nothing secret in a commit, log line or PR; name any config keys this session changed (never values). `git worktree list`: remove this session's merged worktrees and local branches; list ones it created that are pushed but unmerged; leave anything you did not create. Note anything left running or installed on another machine.

9. **Report**, per repo: what changed (PRs, commits, docs), what is pending, and exactly what needs Feather.

Keep every doc concise. No session timestamps or build logs — current state only.
