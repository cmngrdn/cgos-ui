/**
 * The HQ apps and their colours — cgos `docs/hq-system.md` K6 (palette C′).
 *
 * The colour is a TOKEN (`--cg-app-<id>` in `tokens.css`); this module only
 * names it. `appColor(id)` returns `var(--cg-app-<id>, <literal>)` so a
 * consumer never passes hex (U1) and a stale `tokens.css` still renders.
 * `APP_HEX` is the fallback literal and nothing else — `npm run audit:apps`
 * fails if it and `tokens.css` disagree.
 */

export const APP_IDS = [
  'inbox',
  'bookings',
  'library',
  'knowledge',
  'offerings',
  'dispatch',
  'audience',
  'crew',
  'productions',
  'finances',
] as const

export type AppId = (typeof APP_IDS)[number]

export const APP_HEX: Readonly<Record<AppId, string>> = {
  inbox: '#40c95d', // green, like iMessage
  bookings: '#568ef9', // blue
  library: '#e36927', // burnt orange
  knowledge: '#d8c9a3', // bone (Feather, 2026-10-22)
  offerings: '#deb95c', // gold
  dispatch: '#9270f4', // purple
  audience: '#f779ba', // pink
  crew: '#ca2352', // crimson
  productions: '#47c5d2', // teal
  finances: '#96aec3', // steel
}

export function isAppId(id: string): id is AppId {
  return (APP_IDS as readonly string[]).includes(id)
}

/** `var(--cg-app-<id>, #hex)` — the one way to say an app's colour. */
export function appColor(id: AppId): string {
  return `var(--cg-app-${id}, ${APP_HEX[id]})`
}
