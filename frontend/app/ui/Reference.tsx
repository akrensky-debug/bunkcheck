'use client'

import { useEffect, useState, type ReactNode } from 'react'
import CampCard from '@/components/CampCard'
import type { CampSearchResult } from '@/lib/api'
import {
  Button, Checkbox, ChoiceChip, Composer, Container, Divider, EmptyState, Field, Heading, ICON_NAMES, Icon,
  IconButton, Input, List, ListRow, Meta, Notice, Price, SearchBar, SearchField, Section, Select, Skeleton,
  Stack, Surface, Text, TextLink, Textarea, TrustMark, TRUST,
} from '@/components/ui'

const COLORS: Array<[string, string, string]> = [
  ['bg', 'bg-bg', 'Page background (paper)'],
  ['surface', 'bg-surface', 'Inputs, menus, the rare container'],
  ['ink', 'bg-ink', 'Text and icons'],
  ['muted', 'bg-muted', 'Secondary text; AA on bg and surface'],
  ['line', 'bg-line', 'Hairlines and borders'],
  ['tint', 'bg-tint', 'Hover wash, info notices'],
  ['accent', 'bg-accent', 'Primary buttons, user chat bubble'],
  ['accent-hover', 'bg-accent-hover', 'Primary hover'],
  ['highlight', 'bg-highlight', 'Flashlight yellow: fills only, sparingly'],
  ['highlight-soft', 'bg-highlight-soft', 'Warn notices'],
  ['checked', 'bg-checked', 'Verified, done, open'],
  ['checked-soft', 'bg-checked-soft', 'Success notices'],
  ['warn', 'bg-warn', 'Waitlist, missing, check this'],
  ['error', 'bg-error', 'Errors, remove, delete'],
  ['error-soft', 'bg-error-soft', 'Error notices'],
]

const SAMPLE: CampSearchResult = {
  id: 'sample', slug: null, name: 'Riverside STEM Day Camp', city: 'Providence', state: 'RI', camp_type: 'day',
  primary_categories: ['stem', 'coding'], age_min: 7, age_max: 12, price_per_week: 385, price_min: null, price_max: null,
  transportation: true, extended_care: true, meals_included: false, financial_aid: true, aca_accredited: true,
  verification_status: 'team_verified', description_short: 'Robotics, coding and outdoor science in small groups, with a showcase every Friday.',
  hero_image_url: null, distance_miles: 2.4, match_score: null, match_reasons: ['Matches STEM, age 8'], detail_url: null,
}

function toHex(channels: string) {
  const parts = channels.trim().split(/\s+/).map(Number)
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return ''
  return '#' + parts.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function Demo({ title, note, children }: { title: string; note: ReactNode; children: ReactNode }) {
  return (
    <Section title={title} divided>
      <Text tone="muted" variant="small" className="-mt-2 mb-6">{note}</Text>
      {children}
    </Section>
  )
}

export default function Reference() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [chips, setChips] = useState<string[]>(['Allergies'])
  const [checked, setChecked] = useState(true)

  // Read the live token values from :root so this page never holds its own copy.
  useEffect(() => {
    const css = getComputedStyle(document.documentElement)
    setValues(Object.fromEntries(COLORS.map(([name]) => [name, toHex(css.getPropertyValue(`--${name}`))])))
  }, [])

  return (
    <Container className="space-y-16 py-16">
      <header className="space-y-3">
        <Heading level="h1">UI kit</Heading>
        <Text tone="muted">
          Every primitive in <code>components/ui</code>, with its variants. Pages compose these and the tokens below;
          <code> npm run check:ui</code> fails on raw colors, arbitrary values, emoji and all-caps labels. Rules are in
          <code> components/ui/README.md</code>.
        </Text>
      </header>

      <Demo title="Color tokens" note="Role names, backed by CSS variables in app/globals.css. Use them as text-*, bg-*, border-*.">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          {COLORS.map(([name, cls, use]) => (
            <div key={name}>
              <div className={`mb-2 h-12 rounded-md border border-line ${cls}`} />
              <p className="text-small font-semibold text-ink">{name}</p>
              <p className="text-caption text-muted">{values[name]}</p>
              <p className="text-caption text-muted">{use}</p>
            </div>
          ))}
        </div>
      </Demo>

      <Demo title="Type scale" note="Heading levels display, h1, h2, h3 (Figtree); lead, body, small, caption (Atkinson Hyperlegible Next). Body text stops at 65ch.">
        <Stack gap={4}>
          <Heading level="display">Summer, sorted.</Heading>
          <Heading level="h1" as="p">h1: page titles</Heading>
          <Heading level="h2" as="p">h2: section headings</Heading>
          <Heading level="h3" as="p">h3: row titles, card titles</Heading>
          <Text variant="lead">lead: one sentence under a page title.</Text>
          <Text>body: running text. Generous line height and a 65 character measure keep long answers easy to read.</Text>
          <Text variant="small" tone="muted">small, muted: meta lines, help text, secondary actions.</Text>
          <Text variant="caption" tone="muted">caption: timestamps and fine print.</Text>
          <Stack row gap={4} wrap>
            <Text variant="small" tone="checked">tone checked</Text>
            <Text variant="small" tone="warn">tone warn</Text>
            <Text variant="small" tone="error">tone error</Text>
          </Stack>
        </Stack>
      </Demo>

      <Demo title="Radius and shadow" note="rounded-sm 8, rounded-md 12, rounded-lg 16, rounded-pill. One shadow, shadow-soft, for floating things only (composer, search bar, menus).">
        <Stack row gap={6} wrap align="end">
          {['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-pill'].map(r => (
            <div key={r} className="text-center">
              <div className={`mb-2 h-16 w-24 border border-line bg-surface ${r}`} />
              <p className="text-caption text-muted">{r}</p>
            </div>
          ))}
          <div className="text-center">
            <div className="mb-2 h-16 w-24 rounded-lg bg-surface shadow-soft" />
            <p className="text-caption text-muted">shadow-soft</p>
          </div>
        </Stack>
      </Demo>

      <Demo title="Button" note="One primary per view. Secondary for the alternative, link for inline actions, quiet for cancel and housekeeping, danger for remove. Pass href to render a link.">
        <Stack gap={6}>
          <Stack row gap={3} wrap align="center">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="quiet">Quiet</Button>
            <Button variant="danger">Danger</Button>
          </Stack>
          <Stack row gap={3} wrap align="center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg" icon="arrow-right">Large with icon</Button>
            <Button href="#" variant="secondary" icon="external" external>As a link</Button>
            <Button disabled>Disabled</Button>
          </Stack>
          <Stack row gap={3} align="center">
            <IconButton icon="chevron-left" label="Previous" />
            <IconButton icon="chevron-right" label="Next" variant="secondary" />
            <IconButton icon="arrow-up" label="Send" variant="primary" />
          </Stack>
        </Stack>
      </Demo>

      <Demo title="Icon" note="16px grid, 1.5px stroke, currentColor. Decorative by default; pass label when the icon carries meaning alone.">
        <Stack row gap={6} wrap>
          {ICON_NAMES.map(n => (
            <div key={n} className="flex w-20 flex-col items-center gap-2 text-ink">
              <Icon name={n} size={20} />
              <span className="text-caption text-muted">{n}</span>
            </div>
          ))}
        </Stack>
      </Demo>

      <Demo title="Form" note="Field wraps a control with its label, hint and error. Inputs come in sm and md. ChoiceChip picks several from a short list; Checkbox for a single yes/no.">
        <div className="grid max-w-narrow gap-5 sm:grid-cols-2">
          <Field label="Email" hint="We'll send a sign-in link.">{id => <Input id={id} placeholder="you@example.com" />}</Field>
          <Field label="Town" error="We don't cover that town yet.">{id => <Input id={id} defaultValue="Anchorage" />}</Field>
          <Field label="Role" optional>{id => <Select id={id}><option>Co-parent</option><option>Caregiver</option></Select>}</Field>
          <Field label="Small input">{id => <Input id={id} fieldSize="sm" placeholder="fieldSize sm" />}</Field>
          <Field label="Notes" className="sm:col-span-2">{id => <Textarea id={id} rows={2} placeholder="Anything camps should know" />}</Field>
          <div className="space-y-3 sm:col-span-2">
            <Stack row gap={2} wrap>
              {['Allergies', 'Medications', 'Emergency contacts'].map(c => (
                <ChoiceChip key={c} checked={chips.includes(c)} onChange={() => setChips(x => (x.includes(c) ? x.filter(y => y !== c) : [...x, c]))}>{c}</ChoiceChip>
              ))}
            </Stack>
            <Checkbox checked={checked} onChange={e => setChecked(e.target.checked)}>Email me registration reminders</Checkbox>
          </div>
        </div>
      </Demo>

      <Demo title="SearchBar" note="The one search control: labelled fields in a white pill, hairline between them, round navy button.">
        <SearchBar onSubmit={e => e.preventDefault()} className="max-w-narrow">
          <SearchField label="Where" grow placeholder="Town or ZIP" />
          <SearchField label="Age" placeholder="Any" />
        </SearchBar>
      </Demo>

      <Demo title="Composer" note="The chat input. size hero on the empty home page, dock when pinned under a conversation. Enter sends.">
        <Stack gap={4} className="max-w-narrow">
          <Composer size="hero" value={msg} onChange={setMsg} onSubmit={() => setMsg('')} placeholder="Ages, town, and the weeks you need" />
          <Composer value="" onChange={() => {}} onSubmit={() => {}} placeholder="Reply" />
        </Stack>
      </Demo>

      <Demo title="List and ListRow" note="Hairline rows for results and lists. With href the whole row links and gets a light hover wash. CampCard is a ListRow.">
        <div className="max-w-narrow">
          <List>
            <CampCard camp={SAMPLE} />
            <ListRow href="#"><p className="font-display text-h3">A linked row</p><Meta parts={['Meta joins parts', 'skips empty ones', null, 'with a dot']} /></ListRow>
            <ListRow density="compact"><p className="text-small">A compact row without a link</p></ListRow>
          </List>
        </div>
      </Demo>

      <Demo title="Meta, Price, TrustMark, TextLink" note="Meta joins facts with a middle dot. Price is the bold amount and a muted unit. TrustMark shows a listing's status: green check when verified, muted otherwise.">
        <Stack gap={4}>
          <Meta parts={['Providence, RI', '2.4 mi', 'Day camp', 'Ages 7–12']} />
          <Stack row gap={6} wrap align="baseline">
            <Price amount={385} unit="/wk" />
            <Price amount={28} unit="/class" prefix="from" />
          </Stack>
          <Stack row gap={6} wrap>
            {Object.keys(TRUST).map(k => <TrustMark key={k} status={k} />)}
          </Stack>
          <Stack row gap={6} wrap>
            <TextLink href="#">Ink link</TextLink>
            <TextLink href="#" arrow>With arrow</TextLink>
            <TextLink href="#" external>External</TextLink>
            <TextLink href="#" tone="muted">Muted link</TextLink>
          </Stack>
        </Stack>
      </Demo>

      <Demo title="Layout" note="Container sets width (narrow 720, default 1024, wide 1152) and gutters. Section is a heading plus content; divided adds the hairline that separates sections. Surface is the white container, used rarely.">
        <Stack gap={6}>
          <Divider />
          <Surface className="max-w-narrow">
            <p className="text-small">A Surface: white, radius 16, no border, no shadow.</p>
          </Surface>
        </Stack>
      </Demo>

      <Demo title="Feedback" note="Notice for a message that must stand out. EmptyState when a list has nothing. Skeleton while loading.">
        <Stack gap={4} className="max-w-narrow">
          <Notice>Info: copy this link now; it's shown only once.</Notice>
          <Notice tone="warn">Warn: your kit doesn't have a pediatrician yet.</Notice>
          <Notice tone="success">Success: alerts are on.</Notice>
          <Notice tone="error">Error: we couldn't save that.</Notice>
          <EmptyState title="No camps found near Nome." description="Try a nearby town, or leave the age blank." action={<Button variant="secondary">Clear filters</Button>} />
          <Skeleton rows={2} />
        </Stack>
      </Demo>
    </Container>
  )
}
