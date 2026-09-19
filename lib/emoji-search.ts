/**
 * Ranking for the composer's emoji search.
 *
 * Pure and separate from EmojiPicker so it can be asserted without rendering.
 * `npm run audit:emoji` is the check (this package has no test runner either);
 * it moved here with the picker in v0.64.0, since a ranking that lives in one
 * consumer is a ranking the other three cannot have.
 *
 * The rules exist because the corpus is official Unicode names, which are
 * verbose and share words freely. A plain `includes` puts "fire engine" and
 * "campfire" alongside "fire", ordered by codepoint, so the glyph somebody
 * actually meant lands wherever it happens to fall. Three tiers fix that:
 * exact/prefix match first, then word-start, then anything containing the
 * query.
 */

export type EmojiRow = [glyph: string, name: string];

/** Cap on rendered results — a 6-column grid, so 120 is 20 rows of scroll. */
export const EMOJI_RESULT_LIMIT = 120;

export function searchEmoji(all: EmojiRow[], query: string): EmojiRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const exact: EmojiRow[] = [];
  const prefix: EmojiRow[] = [];
  const word: EmojiRow[] = [];
  const rest: EmojiRow[] = [];

  for (const row of all) {
    const name = row[1];
    if (name === q) exact.push(row);
    else if (name.startsWith(q)) prefix.push(row);
    else if (name.includes(` ${q}`)) word.push(row);
    else if (name.includes(q)) rest.push(row);
  }

  return [...exact, ...prefix, ...word, ...rest].slice(0, EMOJI_RESULT_LIMIT);
}
