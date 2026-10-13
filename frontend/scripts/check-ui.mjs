#!/usr/bin/env node
// UI guardrail: pages and feature components must compose components/ui and the design
// tokens, not raw values. Run with `npm run check:ui`. Scans app/, components/ (except
// components/ui, which owns the raw values) and lib/. app/globals.css holds the tokens and is
// skipped. A line ending in a `ui-check-ignore` comment is allowed, with a reason.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const DIRS = ['app', 'components', 'lib']
const SKIP = [join('components', 'ui') + sep, join('app', 'globals.css')]
const EXT = /\.(tsx?|jsx?|css|mdx?)$/

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|brand|navy|night|paper|flashlight|offwhite|tile|white|black'

const RULES = [
  { name: 'raw hex color (use a token: text-ink, bg-surface, border-line…)', re: /#[0-9a-fA-F]{3,8}\b/g },
  { name: 'arbitrary Tailwind value (add a token or use the scale)', re: /[\w:-]+-\[[^\]\s]+\]/g },
  { name: 'arbitrary Tailwind property', re: /(?<=^|[\s"'`{])\[[a-z-]+:[^\]\s]+\](?=$|[\s"'`}])/g },
  { name: 'default or retired palette color (use role tokens)', re: new RegExp(`\\b(?:text|bg|border|ring|divide|decoration|outline|from|to|via|fill|stroke|placeholder|accent|caret)-(?:${PALETTE})(?:-\\d{2,3})?\\b`, 'g') },
  { name: 'default type size (use text-display/h1/h2/h3/lead/body/small/caption)', re: /\btext-(?:xs|sm|base|lg|[2-9]?xl)\b/g },
  { name: 'uppercase or tracked label (use sentence case)', re: /\b(?:uppercase|tracking-(?:wide|wider|widest))\b/g },
  { name: 'emoji or symbol glyph (use <Icon> or words)', re: /[\p{Extended_Pictographic}✓✔✗✘←-↙›‹]/gu },
  { name: 'retired motion class', re: /\b(?:btn-lift|card-interactive|data-reveal|animate-rise-in|check-draw|nav-link)\b/g },
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (EXT.test(name)) out.push(p)
  }
  return out
}

const problems = []
for (const d of DIRS) {
  for (const file of walk(join(root, d))) {
    const rel = relative(root, file)
    if (SKIP.some(s => rel === s || rel.startsWith(s))) continue
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (line.includes('ui-check-ignore')) return
      for (const rule of RULES) {
        for (const m of line.matchAll(rule.re)) {
          problems.push(`${rel}:${i + 1}  ${rule.name}: ${m[0]}`)
        }
      }
    })
  }
}

if (problems.length) {
  console.error(problems.join('\n'))
  console.error(`\ncheck:ui found ${problems.length} problem${problems.length === 1 ? '' : 's'}. See components/ui/README.md.`)
  process.exit(1)
}
console.log('check:ui passed')
