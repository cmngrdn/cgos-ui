#!/usr/bin/env node
/**
 * Emoji search, asserted.
 *
 *     npm run audit:emoji
 *
 * Moved here from cmngrdn with the picker (v0.64.0): a ranking that lives in
 * one consumer is a ranking the other three cannot have. Deliberately not a
 * gate — an emoji picker does not warrant blocking a deploy. It runs on demand
 * and in review.
 *
 * What it guards is the RANKING, which is the part that silently rots. The
 * corpus is official Unicode names — verbose, and sharing words freely — so a
 * plain substring match returns "fire engine", "campfire" and "firecracker"
 * ordered by codepoint, and the glyph somebody meant lands wherever it falls.
 * Someone simplifying `searchEmoji` back to `.includes()` would break nothing
 * visible: results still appear, just wrong-order. These assertions are what
 * notices.
 *
 * Also checks the generated dataset is present and sane, because it is produced
 * by a Python script that nobody runs on a normal day.
 */
import { searchEmoji, EMOJI_RESULT_LIMIT } from "../lib/emoji-search.ts";
import { EMOJI_DATA } from "../lib/emoji-data.ts";

let failed = 0;
const check = (label, cond, detail = "") => {
  if (cond) return;
  failed++;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
};

// ── dataset sanity ──────────────────────────────────────────────────────────
check("dataset is populated", EMOJI_DATA.length > 1500, `got ${EMOJI_DATA.length}`);
check(
  "every row is [glyph, lowercase name]",
  EMOJI_DATA.every((r) => Array.isArray(r) && r.length === 2 && r[0] && r[1] === r[1].toLowerCase()),
);
check("glyphs are unique", new Set(EMOJI_DATA.map((r) => r[0])).size === EMOJI_DATA.length);
check(
  "no multi-codepoint sequences (ZWJ / skin tone) — they cost SMS characters for the same encoding hit",
  EMOJI_DATA.every((r) => [...r[0]].length === 1),
);

// ── ranking ─────────────────────────────────────────────────────────────────
const first = (q) => searchEmoji(EMOJI_DATA, q)[0]?.[0];
const rankOf = (q, glyph) => searchEmoji(EMOJI_DATA, q).findIndex((r) => r[0] === glyph);

check("exact name wins: 'fire' → 🔥", first("fire") === "🔥", `got ${first("fire")}`);
check("exact name wins: 'rocket' → 🚀", first("rocket") === "🚀", `got ${first("rocket")}`);
check("exact name wins: 'skull' → 💀", first("skull") === "💀", `got ${first("skull")}`);

check(
  "compound names rank BELOW the exact match, not above",
  rankOf("fire", "🔥") < rankOf("fire", "🧨"),
  "firecracker outranked fire",
);

check(
  "word-start beats mid-word: 'heart' finds a heart before 'heartbeat'-style compounds do",
  (() => {
    const r = searchEmoji(EMOJI_DATA, "heart");
    return r.length > 0 && r[0][1].startsWith("heart");
  })(),
);

// ── contract ────────────────────────────────────────────────────────────────
check("empty query returns nothing (curated view is shown instead)", searchEmoji(EMOJI_DATA, "").length === 0);
check("whitespace-only query returns nothing", searchEmoji(EMOJI_DATA, "   ").length === 0);
check("query is case-insensitive", first("FIRE") === "🔥");
check("query is trimmed", first("  fire  ") === "🔥");
check("nonsense returns empty rather than throwing", searchEmoji(EMOJI_DATA, "zzzzq").length === 0);
check(
  `results are capped at ${EMOJI_RESULT_LIMIT}`,
  searchEmoji(EMOJI_DATA, "a").length <= EMOJI_RESULT_LIMIT,
);
check("no duplicate rows across tiers", (() => {
  const r = searchEmoji(EMOJI_DATA, "face");
  return new Set(r.map((x) => x[0])).size === r.length;
})());

if (failed) {
  console.error(`\n✗ emoji search: ${failed} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `✓ emoji search: ${EMOJI_DATA.length} glyphs, ranking + contract assertions pass.`,
);
