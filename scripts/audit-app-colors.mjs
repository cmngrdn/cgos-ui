#!/usr/bin/env node
/**
 * The app colours, asserted: every `--cg-app-<id>` in tokens.css equals the
 * fallback literal in lib/apps.ts, and every app has both.
 *
 *     npm run audit:apps
 */
import { readFileSync } from 'node:fs'

const tokens = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8')
const lib = readFileSync(new URL('../lib/apps.ts', import.meta.url), 'utf8')

const fromTokens = Object.fromEntries(
  [...tokens.matchAll(/--cg-app-([a-z]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2].toLowerCase()]),
)
const hexBlock = lib.slice(lib.indexOf('APP_HEX'), lib.indexOf('}', lib.indexOf('APP_HEX')))
const fromLib = Object.fromEntries(
  [...hexBlock.matchAll(/([a-z]+):\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => [m[1], m[2].toLowerCase()]),
)
const ids = [...lib.matchAll(/^\s*'([a-z]+)',$/gm)].map((m) => m[1])

const problems = []
for (const id of ids) {
  if (!fromTokens[id]) problems.push(`${id}: no --cg-app-${id} in tokens.css`)
  if (!fromLib[id]) problems.push(`${id}: no APP_HEX entry in lib/apps.ts`)
  if (fromTokens[id] && fromLib[id] && fromTokens[id] !== fromLib[id])
    problems.push(`${id}: tokens.css ${fromTokens[id]} ≠ lib/apps.ts ${fromLib[id]}`)
}
for (const id of Object.keys(fromTokens)) if (!ids.includes(id)) problems.push(`${id}: in tokens.css, not in APP_IDS`)

if (ids.length === 0) problems.push('read no APP_IDS — the parser is wrong, not the palette')
if (problems.length) {
  console.error('[apps] ✗\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log(`[apps] ✓ ${ids.length} app colours, tokens.css and lib/apps.ts agree.`)
