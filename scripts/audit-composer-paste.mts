/**
 * The paste sanitiser, asserted.
 *
 *     npm run audit:composer
 *
 * This is the Composer's security boundary. A paste is attacker-controlled
 * markup arriving from an arbitrary page or email, going into a body that may
 * then be sent to the entire audience — so the interesting cases are all about
 * what must NOT survive, and none of them are visible by reading the component.
 *
 * Two of the assertions below started as bugs found by running this file:
 *   - `<script>` was being unwrapped to its own source text, putting `alert(1)`
 *     into the message as visible prose.
 *   - a `javascript:` anchor needed to lose the link but keep its label, rather
 *     than vanishing along with the words the operator pasted.
 */
import { JSDOM } from 'jsdom'

import {
  CHANNEL_CAPABILITIES,
  composerIsEmpty,
  effectivePasteMode,
  sanitizePastedHtml,
} from '../ui/composer-core.ts'

const doc = new JSDOM('').window.document
let failed = 0
const check = (label: string, got: unknown, want: unknown) => {
  if (got === want) return
  failed++
  console.error(`  ✗ ${label}\n      got:  ${got}\n      want: ${want}`)
}
const san = (html: string) => sanitizePastedHtml(html, doc)

// ── what must survive: the whole point of rich paste ────────────────────────
check(
  'Gmail paste keeps bold + link, drops font and colour',
  san('<div style="font-family:Arial;color:#222"><b>New single</b> — <a href="https://feather.fm" style="color:#15c">listen</a></div>'),
  '<b>New single</b> — <a href="https://feather.fm" rel="noopener noreferrer">listen</a>',
)
check('nested emphasis inside a list survives', san('<ul><li><i>one</i></li><li><strong>two</strong></li></ul>'), '<ul><li><i>one</i></li><li><strong>two</strong></li></ul>')
check('mailto links survive', san('<a href="mailto:f@cmngrdn.com">email</a>'), '<a href="mailto:f@cmngrdn.com" rel="noopener noreferrer">email</a>')
check('underline survives', san('<u>underlined</u>'), '<u>underlined</u>')
check('paragraphs and breaks survive', san('<p>one</p><p>two<br>three</p>'), '<p>one</p><p>two<br>three</p>')

// ── what must not survive ───────────────────────────────────────────────────
check('javascript: href loses the link but keeps the words', san('<a href="javascript:alert(1)">click me</a>'), 'click me')
check('data: href loses the link', san('<a href="data:text/html,<b>x</b>">x</a>'), 'x')
check('script is removed WITH its source, not unwrapped to text', san('hello<script>alert(1)</script> world'), 'hello world')
check('style block is removed with its contents', san('<style>.a{color:red}</style>keep'), 'keep')
check('iframe is removed entirely', san('<iframe src="http://evil"></iframe>text'), 'text')
check('images are dropped, surrounding text kept', san('<span class="x"><img src="http://evil/p.gif">text</span>'), 'text')
check('event-handler attributes are stripped', san('<b onclick="steal()">bold</b>'), '<b>bold</b>')
check('class and id are stripped', san('<b class="c" id="i">x</b>'), '<b>x</b>')
check('unknown tags unwrap to their text', san('<marquee>hi</marquee>'), 'hi')
check('empty input is empty output', san(''), '')

// ── channel enforcement ─────────────────────────────────────────────────────
check("SMS can't opt into rich paste even by asking", effectivePasteMode(CHANNEL_CAPABILITIES.sms, 'rich'), 'plain')
check('social is plain too', effectivePasteMode(CHANNEL_CAPABILITIES.social, 'rich'), 'plain')
check('email honours rich', effectivePasteMode(CHANNEL_CAPABILITIES.email, 'rich'), 'rich')
check('email still honours an explicit plain', effectivePasteMode(CHANNEL_CAPABILITIES.email, 'plain'), 'plain')
check('rcs is ready for the day it ships', CHANNEL_CAPABILITIES.rcs.includes('bold'), true)

// ── emptiness (the iOS stray-<br> case) ─────────────────────────────────────
check('whitespace-only is empty', composerIsEmpty({ innerText: '   ' }), true)
check('null element is empty', composerIsEmpty(null), true)
check('real text is not empty', composerIsEmpty({ innerText: 'hi' }), false)

if (failed) {
  console.error(`\n✗ composer paste: ${failed} assertion(s) failed.\n`)
  process.exit(1)
}
console.log('✓ composer paste: sanitiser, channel enforcement and emptiness all pass.')
