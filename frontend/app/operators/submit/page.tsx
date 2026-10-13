'use client'

import { useState } from 'react'
import { submitCamp } from '@/lib/api'
import { Events } from '@/lib/analytics'
import { Button, ChoiceChip, Container, Field, Heading, Icon, Input, Section, Text, TextLink, Textarea } from '@/components/ui'

const CAMP_TYPES = ['day', 'sleepaway', 'specialty']
const CATEGORIES = [
  'arts', 'sports', 'stem', 'music', 'nature', 'academic',
  'language', 'dance', 'theater', 'coding', 'swimming', 'tennis',
  'basketball', 'soccer', 'leadership', 'adventure',
]

export default function SubmitCampPage() {
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    city: '',
    state: '',
    camp_type: 'day',
    contact_email: '',
    contact_name: '',
    phone: '',
    website_url: '',
    description_short: '',
    age_min: '',
    age_max: '',
    price_per_week: '',
    categories: [] as string[],
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleCategory(cat: string) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    Events.campSubmissionStarted()
    try {
      await submitCamp({
        name: form.name,
        city: form.city,
        state: form.state,
        camp_type: form.camp_type,
        contact_email: form.contact_email,
        contact_name: form.contact_name || undefined,
        phone: form.phone || undefined,
        website_url: form.website_url || undefined,
        description_short: form.description_short || undefined,
        age_min: form.age_min ? Number(form.age_min) : undefined,
        age_max: form.age_max ? Number(form.age_max) : undefined,
        price_per_week: form.price_per_week ? Number(form.price_per_week) : undefined,
        primary_categories: form.categories.length > 0 ? form.categories : undefined,
      })
      setStep('done')
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <Container size="narrow" className="py-24">
        <p className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-pill bg-checked-soft text-checked">
          <Icon name="check" size={24} label="Submitted" />
        </p>
        <Heading level="h1" className="mb-3">Camp submitted</Heading>
        <Text tone="muted" className="mb-6">
          We&rsquo;ll review your listing and publish it within one to two business days. You&rsquo;ll get a
          confirmation at <strong className="text-ink">{form.contact_email}</strong>.
        </Text>
        <TextLink href="/operators/claim" arrow>Already listed? Claim your listing to verify and update it</TextLink>
      </Container>
    )
  }

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <TextLink href="/operators" tone="muted" className="mb-10 text-small">
        <Icon name="arrow-left" size={14} />For camps
      </TextLink>

      <Heading level="h1" className="mb-3">List your camp</Heading>
      <Text tone="muted" className="mb-12">
        Free to submit. We review every listing and publish it within one to two business days.
      </Text>

      <form onSubmit={handleSubmit} className="space-y-12">
        <Section title="Camp basics" level="h3" className="space-y-5">
          <Field label="Camp name">
            {id => <Input id={id} type="text" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sunrise Day Camp" />}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Town">
              {id => <Input id={id} type="text" required value={form.city} onChange={e => set('city', e.target.value)} placeholder="Boston" />}
            </Field>
            <Field label="State">
              {id => <Input id={id} type="text" required maxLength={2} value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} placeholder="MA" />}
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-small font-semibold text-ink">Camp type</legend>
            <div className="flex flex-wrap gap-2">
              {CAMP_TYPES.map(t => (
                <ChoiceChip key={t} type="radio" name="camp_type" checked={form.camp_type === t} onChange={() => set('camp_type', t)}>
                  {t === 'day' ? 'Day camp' : t === 'sleepaway' ? 'Sleepaway' : 'Specialty'}
                </ChoiceChip>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section title="Contact" level="h3" divided className="space-y-5">
          <Field label="Contact email" hint="Used to verify ownership. Not shown publicly.">
            {id => <Input id={id} type="email" required value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="director@yourcamp.com" />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" optional>
              {id => <Input id={id} type="text" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Jane Smith" />}
            </Field>
            <Field label="Phone" optional>
              {id => <Input id={id} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(617) 555-0100" />}
            </Field>
          </div>
          <Field label="Camp website" optional>
            {id => <Input id={id} type="url" value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://yourcamp.com" />}
          </Field>
        </Section>

        <Section title="Details" level="h3" divided className="space-y-5">
          <Field label="Short description" optional hint={`${form.description_short.length}/300. One or two sentences; this appears in search results.`}>
            {id => <Textarea id={id} rows={3} value={form.description_short} onChange={e => set('description_short', e.target.value)} maxLength={300} />}
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Youngest">
              {id => <Input id={id} type="number" min={3} max={18} value={form.age_min} onChange={e => set('age_min', e.target.value)} placeholder="5" />}
            </Field>
            <Field label="Oldest">
              {id => <Input id={id} type="number" min={3} max={18} value={form.age_max} onChange={e => set('age_max', e.target.value)} placeholder="16" />}
            </Field>
            <Field label="$ a week">
              {id => <Input id={id} type="number" min={0} value={form.price_per_week} onChange={e => set('price_per_week', e.target.value)} placeholder="650" />}
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-small font-semibold text-ink">Categories <span className="font-normal text-muted">(all that apply)</span></legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <ChoiceChip key={cat} checked={form.categories.includes(cat)} onChange={() => toggleCategory(cat)}>
                  {cat === 'stem' ? 'STEM' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </ChoiceChip>
              ))}
            </div>
          </fieldset>
        </Section>

        <div className="space-y-3 border-t border-line pt-8">
          {error && <p className="text-small text-error">{error}</p>}
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit camp for review'}
          </Button>
          <p className="text-caption text-muted">
            By submitting you confirm you&rsquo;re authorized to list this camp. We review listings before publishing.
          </p>
        </div>
      </form>
    </Container>
  )
}
