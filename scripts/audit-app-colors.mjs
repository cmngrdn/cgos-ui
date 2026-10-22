#!/usr/bin/env node
/**
 * The app colours, asserted: every `--cg-app-<id>` in tokens.css equals the
 * fallback literal in lib/apps.ts, and every app has both — once for night
 * (the `:root` block, `APP_HEX`) and once for Day (the light block,
 * `APP_HEX_DAY`, v0.84.0).
 *
 * The Day values are also MEASURED, because they exist for one reason: an app
 * colour is worn as text (a window's name, its search field, Knowledge's
 * icons), and the night values fell to 1.4:1 on paper. Each Day value must
 * clear 4.5:1 on the light theme's own ground and 4.5:1 under a white glyph
 * (the adaptive chip is solid on a light ground).
 *
 *     npm run audit:apps
 */
import { readFileSync } from 'node:fs'

const tokens = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8')
const lib = readFileSync(new URL('../lib/apps.ts', import.meta.url), 'utf8')

const lightAt = tokens.indexOf(':root[data-theme="light"]')
if (lightAt < 0) {
  console.error('[apps] ✗ no :root[data-theme="light"] block in tokens.css — the parser is wrong, not the palette')
  process.exit(1)
}
const lightEnd = tokens.indexOf('\n}', lightAt)
const readTokens = (css) =>
  Object.fromEntries([...css.matchAll(/--cg-app-([a-z]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2].toLowerCase()]))
const nightTokens = readTokens(tokens.slice(0, lightAt))
const dayTokens = readTokens(tokens.slice(lightAt, lightEnd))
const lightBg = (tokens.slice(lightAt, lightEnd).match(/--cg-bg:\s*(#[0-9a-fA-F]{6})/) ?? [])[1]

const readBlock = (name) => {
  const at = lib.indexOf(`export const ${name}:`)
  if (at < 0) return {}
  const block = lib.slice(at, lib.indexOf('}', at))
  return Object.fromEntries([...block.matchAll(/([a-z]+):\s*'(#[0-9a-fA-F]{6})'/g)].map((m) => [m[1], m[2].toLowerCase()]))
}
const nightLib = readBlock('APP_HEX')
const dayLib = readBlock('APP_HEX_DAY')
const ids = [...lib.matchAll(/^\s*'([a-z]+)',$/gm)].map((m) => m[1])

const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
    .map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

const problems = []
for (const [label, fromTokens, fromLib, libName] of [
  ['night', nightTokens, nightLib, 'APP_HEX'],
  ['day', dayTokens, dayLib, 'APP_HEX_DAY'],
]) {
  for (const id of ids) {
    if (!fromTokens[id]) problems.push(`${id} (${label}): no --cg-app-${id} in tokens.css`)
    if (!fromLib[id]) problems.push(`${id} (${label}): no ${libName} entry in lib/apps.ts`)
    if (fromTokens[id] && fromLib[id] && fromTokens[id] !== fromLib[id])
      problems.push(`${id} (${label}): tokens.css ${fromTokens[id]} ≠ lib/apps.ts ${fromLib[id]}`)
  }
  for (const id of Object.keys(fromTokens)) if (!ids.includes(id)) problems.push(`${id} (${label}): in tokens.css, not in APP_IDS`)
}
if (!lightBg) problems.push('no --cg-bg in the light block to measure Day values against')
for (const id of ids) {
  const day = dayTokens[id]
  if (!day || !lightBg) continue
  const onPaper = ratio(day, lightBg)
  const underWhite = ratio(day, '#ffffff')
  if (onPaper < 4.5) problems.push(`${id} (day): ${day} is ${onPaper.toFixed(2)}:1 on ${lightBg} (want ≥ 4.5)`)
  if (underWhite < 4.5) problems.push(`${id} (day): a white glyph on ${day} is ${underWhite.toFixed(2)}:1 (want ≥ 4.5)`)
}

if (ids.length === 0) problems.push('read no APP_IDS — the parser is wrong, not the palette')
if (problems.length) {
  console.error('[apps] ✗\n  ' + problems.join('\n  '))
  process.exit(1)
}
console.log(`[apps] ✓ ${ids.length} app colours, night and day; tokens.css and lib/apps.ts agree; every Day value ≥ 4.5:1 on ${lightBg} and under white.`)
