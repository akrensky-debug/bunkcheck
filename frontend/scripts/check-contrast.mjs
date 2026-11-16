#!/usr/bin/env node
// WCAG contrast for every status color pair, read from the tokens in app/globals.css.
// Text needs 4.5:1 (1.4.3). Shapes, edges and strip segments need 3:1 against what they sit
// on (1.4.11). Runs in `npm run check:ui`; prints every pair and fails on any below its bar.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const css = readFileSync(join(root, 'app', 'globals.css'), 'utf8')

// --name: R G B;  or  --name: var(--other);
const raw = {}
for (const m of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) raw[m[1]] = m[2].replace(/\/\*.*?\*\//g, '').trim()
function rgb(name, seen = new Set()) {
  const v = raw[name]
  if (v == null) throw new Error(`No token --${name} in app/globals.css`)
  const alias = v.match(/^var\(--([\w-]+)\)$/)
  if (alias) {
    if (seen.has(name)) throw new Error(`Token loop at --${name}`)
    seen.add(name)
    return rgb(alias[1], seen)
  }
  const parts = v.split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error(`--${name} is not "R G B": ${v}`)
  return parts
}

const lum = c => {
  const [r, g, b] = c.map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const hex = c => '#' + c.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase()

const PAGES = ['bg', 'surface', 'tint']
const TONES = [
  // [tone, foreground token, its soft fill]
  ['go', 'go', 'go-soft'],
  ['caution', 'caution', 'caution-soft'],
  ['stop', 'stop', 'stop-soft'],
  ['neutral', 'muted', 'tint'],
]

const checks = []
for (const [tone, fg, soft] of TONES) {
  // Text: StatusMark labels on the page, on white, on a hover wash, and on the tone's own fill.
  for (const bg of [...new Set([...PAGES, soft])]) checks.push({ kind: 'text', tone, fg, bg, min: 4.5 })
  // Marks: StatusDot shapes, the left edge on a calendar cell, the strip segment's dot and bar.
  for (const bg of [...new Set([...PAGES, soft])]) checks.push({ kind: 'mark', tone, fg, bg, min: 3 })
}
// The check knocked out of the filled go disc.
checks.push({ kind: 'mark', tone: 'go', fg: 'surface', bg: 'go', min: 3 })
// Caution must not read as the flashlight yellow, which means checked in the logo.
checks.push({ kind: 'apart', tone: 'caution', fg: 'caution', bg: 'highlight', min: 3 })
// The trust alias must stay the go green.
if (hex(rgb('checked')) !== hex(rgb('go'))) checks.push({ kind: 'alias', tone: 'go', fg: 'checked', bg: 'go', min: Infinity })

let failed = 0
const rows = checks.map(c => {
  const r = c.min === Infinity ? 0 : ratio(rgb(c.fg), rgb(c.bg))
  const ok = r >= c.min
  if (!ok) failed++
  return [ok ? 'ok  ' : 'FAIL', c.kind.padEnd(5), c.tone.padEnd(8),
    `${c.fg} ${hex(rgb(c.fg))}`.padEnd(24), `on ${c.bg} ${hex(rgb(c.bg))}`.padEnd(27),
    `${r.toFixed(2)}:1`.padStart(8), `(min ${c.min})`].join(' ')
})
console.log(rows.join('\n'))
if (failed) {
  console.error(`\ncheck:contrast found ${failed} pair${failed === 1 ? '' : 's'} under the bar.`)
  process.exit(1)
}
console.log(`check:contrast passed (${checks.length} pairs)`)
