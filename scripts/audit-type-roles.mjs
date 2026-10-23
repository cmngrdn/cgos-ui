#!/usr/bin/env node
/**
 * The atoms speak the UI type scale (v0.86.0): a literal px font-size in `ui/*.css` is one more size that isn't
 * on the scale and doesn't step up on a phone. Existing literals are a ceiling that may only go down:
 *   - Input / Select / Composer keep `16px` under the phone media query — the iOS rule that a field under 16px
 *     zooms the page on focus. That one is a platform fact, not a style.
 *   - RcsCardPreview draws an Android RCS card at the device's own sizes.
 *   - a badge glyph in a ≤20px box, and a display figure over 34px.
 * Use `var(--cg-type-<role>-size, <default>px)`; see docs/subsystems/type-and-space.md.
 *
 *     npm run audit:type
 */
import { readdirSync, readFileSync } from 'node:fs'

const BASELINE = 9
const dir = new URL('../ui/', import.meta.url)
let n = 0
const where = []
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.css')) continue
  const lines = readFileSync(new URL(f, dir), 'utf8').split('\n')
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/font-size:\s*\d+(?:\.\d+)?px/g)) {
      n++
      where.push(`ui/${f}:${i + 1}  ${m[0]}`)
    }
  })
}
if (n > BASELINE) {
  console.error(`[type] ✗ ${n} literal px font-sizes in ui/*.css, ceiling ${BASELINE}. Use a role:\n  var(--cg-type-<display|title|heading|body|small|detail|label>-size, <default>px)\n\n  ${where.join('\n  ')}`)
  process.exit(1)
}
console.log(n < BASELINE ? `[type] ✓ ${n} literal sizes — lower BASELINE to ${n}.` : `[type] ✓ ${n} literal sizes, at the ceiling (iOS 16px fields, the RCS preview, badges, figures).`)
