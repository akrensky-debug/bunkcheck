'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from '@/lib/auth'
import { deleteFamily, downloadFamilyData, loadFamily, type Family } from '@/lib/agent'
import {
  CHILD_LABELS, HOUSEHOLD_LABELS, createShare, getKit, listShares, revokeShare, saveKit,
  type Child, type Contact, type InfoKit, type ShareSummary,
} from '@/lib/kit'
import { Button, ChoiceChip, Container, Heading, Input, Notice, Section, Select, Text, TextLink, Textarea } from '@/components/ui'

const EMPTY_KIT: InfoKit = {
  household: { parents: [], emergency_contacts: [], authorized_pickups: [] },
  children: [],
}
const CONTACT_LISTS = ['parents', 'emergency_contacts', 'authorized_pickups'] as const
const HOUSEHOLD_TEXT = [
  'home_address', 'insurance_provider', 'insurance_member_id', 'insurance_group_number',
  'pediatrician_name', 'pediatrician_phone',
] as const
const LONG_CHILD = new Set(['allergies', 'medications', 'medical_conditions', 'notes'])


export default function KitPage() {
  const session = useSession()
  const router = useRouter()
  const [family, setFamily] = useState<Family | null>(null)
  const [kit, setKit] = useState<InfoKit>(EMPTY_KIT)
  const [shares, setShares] = useState<ShareSummary[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (session === null) router.replace('/signin')
    if (!session) return
    loadFamily()
      .then(async f => {
        if (!f.can_open_kit) {
          // Caregivers, viewers and co-parents without access: no form to fill in and lose.
          setError('private')
          return
        }
        setFamily(f)
        const [k, s] = await Promise.all([getKit(f.id), listShares(f.id)])
        // First visit: start a card for each kid the agent already knows about.
        if (!k.children.length && f.profile.kids?.length) {
          k.children = f.profile.kids.filter(kid => kid.name).map(kid => ({ name: kid.name as string }))
        }
        setKit(k)
        setShares(s)
      })
      .catch(e => setError(e.message))
  }, [session, router])

  async function save() {
    if (!family) return
    setStatus('Saving…')
    setError('')
    try {
      await saveKit(family.id, {
        ...kit,
        children: kit.children.filter(c => c.name.trim()),
      })
      setStatus('Saved and encrypted.')
    } catch (e) {
      setStatus('')
      setError((e as Error).message)
    }
  }

  function setHousehold(field: string, value: unknown) {
    setKit(k => ({ ...k, household: { ...k.household, [field]: value } }))
    setStatus('')
  }

  function setChild(i: number, field: keyof Child, value: string) {
    setKit(k => ({ ...k, children: k.children.map((c, j) => (j === i ? { ...c, [field]: value || null } : c)) }))
    setStatus('')
  }

  async function download() {
    if (!family) return
    setStatus('Preparing your download…')
    try {
      await downloadFamilyData(family.id)
      setStatus('')
    } catch (e) {
      setStatus('')
      setError((e as Error).message)
    }
  }

  async function eraseEverything() {
    if (!family) return
    if (!confirm('Delete your family, calendar, conversations and info kit permanently? This cannot be undone.')) return
    await deleteFamily(family.id)
    await signOut()
    router.replace('/')
  }

  if (error === 'private') {
    return (
      <Container size="narrow" className="space-y-4 py-16 sm:py-24">
        <Heading level="h1">Info kit</Heading>
        <Text tone="muted">
          The info kit (medical details, emergency contacts, insurance) is private to the family&rsquo;s owner.
          They can give a co-parent access from the Household page.
        </Text>
        <TextLink href="/household" arrow>Go to Household</TextLink>
      </Container>
    )
  }

  if (!session || !family) {
    return <Container size="narrow" className="py-16"><Text tone="muted">{error || 'Loading…'}</Text></Container>
  }

  return (
    <Container size="narrow" className="space-y-14 py-12 sm:py-16">
      <header className="space-y-3">
        <Heading level="h1">Info kit</Heading>
        <Text tone="muted">
          What camps ask for at registration, filled in once. It&rsquo;s encrypted, never shown to the
          assistant, and shared only as a package you choose.
        </Text>
        <TextLink href="/registrations" arrow className="text-small">Registrations and reminders</TextLink>
      </header>

      <Section title="Household" className="space-y-6">
        {CONTACT_LISTS.map(list => (
          <ContactList
            key={list}
            label={HOUSEHOLD_LABELS[list]}
            contacts={kit.household[list]}
            onChange={v => setHousehold(list, v)}
          />
        ))}
        <div className="grid sm:grid-cols-2 gap-3">
          {HOUSEHOLD_TEXT.map(f => (
            <label key={f} className="flex flex-col gap-1.5 text-small font-semibold text-ink">
              <span>{HOUSEHOLD_LABELS[f]}</span>
              <Input
                fieldSize="sm"
                value={(kit.household[f] as string | null) ?? ''}
                onChange={e => setHousehold(f, e.target.value || null)}
              />
            </label>
          ))}
        </div>
      </Section>

      <Section
        title="Kids"
        divided
        action={
          <Button variant="link" leadingIcon="plus" onClick={() => setKit(k => ({ ...k, children: [...k.children, { name: '' }] }))}>
            Add a child
          </Button>
        }
      >
        <div className="divide-y divide-line">
        {kit.children.map((c, i) => (
          <div key={i} className="space-y-4 py-6 first:pt-0">
            <div className="flex items-end gap-4">
              <label className="flex flex-1 flex-col gap-1.5 text-small font-semibold text-ink">
                <span>Name on forms</span>
                <Input fieldSize="sm" value={c.name} onChange={e => setChild(i, 'name', e.target.value)} />
              </label>
              <Button
                variant="quiet"
                onClick={() => setKit(k => ({ ...k, children: k.children.filter((_, j) => j !== i) }))}
                className="pb-2"
              >
                Remove
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.keys(CHILD_LABELS).map(f => (
                <label key={f} className={`flex flex-col gap-1.5 text-small font-semibold text-ink ${LONG_CHILD.has(f) ? 'sm:col-span-2' : ''}`}>
                  <span>{CHILD_LABELS[f]}</span>
                  {LONG_CHILD.has(f) ? (
                    <Textarea
                      rows={2}
                      className="text-small font-normal"
                      value={(c[f as keyof Child] as string | null) ?? ''}
                      onChange={e => setChild(i, f as keyof Child, e.target.value)}
                    />
                  ) : (
                    <Input
                      fieldSize="sm"
                      type={f === 'date_of_birth' ? 'date' : 'text'}
                      className="font-normal"
                      value={(c[f as keyof Child] as string | null) ?? ''}
                      onChange={e => setChild(i, f as keyof Child, e.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
        </div>
      </Section>

      <div className="sticky bottom-0 flex items-center gap-4 border-t border-line bg-bg py-4">
        <Button onClick={save}>Save</Button>
        {status && <span className="text-small text-muted">{status}</span>}
        {error && <span className="text-small text-error">{error}</span>}
      </div>

      <SharePanel familyId={family.id} kit={kit} shares={shares} onShares={setShares} />

      <Section title="Your data" divided className="space-y-4">
        {family.role === 'owner' && (
          <Text tone="muted" variant="small">
            Download is one file with everything we hold about your family, including this info kit, so keep it
            somewhere safe. Deleting removes your family profile, calendar, conversations, info kit and every share
            link, permanently.
          </Text>
        )}
        <div className="flex flex-wrap gap-6">
          <Button variant="quiet" onClick={() => signOut().then(() => router.replace('/'))}>Sign out</Button>
          {family.role === 'owner' && (
            <>
              <Button variant="link" onClick={download}>Download my family&rsquo;s data</Button>
              <Button variant="danger" onClick={eraseEverything}>Delete everything</Button>
            </>
          )}
        </div>
      </Section>
    </Container>
  )
}

function ContactList({ label, contacts, onChange }: { label: string; contacts: Contact[]; onChange: (c: Contact[]) => void }) {
  const update = (i: number, field: keyof Contact, value: string) =>
    onChange(contacts.map((c, j) => (j === i ? { ...c, [field]: value || null } : c)))
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-small font-semibold text-ink">{label}</span>
        <Button variant="link" size="sm" leadingIcon="plus" onClick={() => onChange([...contacts, { name: '' }])}>Add</Button>
      </div>
      {contacts.map((c, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 sm:flex">
          <Input fieldSize="sm" aria-label="Name" placeholder="Name" value={c.name} onChange={e => update(i, 'name', e.target.value)} />
          <Input fieldSize="sm" aria-label="Relationship" placeholder="Relationship" value={c.relationship ?? ''} onChange={e => update(i, 'relationship', e.target.value)} />
          <Input fieldSize="sm" aria-label="Phone" placeholder="Phone" value={c.phone ?? ''} onChange={e => update(i, 'phone', e.target.value)} />
          <Button variant="quiet" size="sm" onClick={() => onChange(contacts.filter((_, j) => j !== i))} className="justify-self-start">
            Remove
          </Button>
        </div>
      ))}
    </div>
  )
}

function SharePanel({ familyId, kit, shares, onShares }: {
  familyId: string; kit: InfoKit; shares: ShareSummary[]; onShares: (s: ShareSummary[]) => void
}) {
  const [recipient, setRecipient] = useState('')
  const [kids, setKids] = useState<string[]>([])
  const [household, setHousehold] = useState<string[]>(['parents', 'emergency_contacts', 'authorized_pickups'])
  const [childFields, setChildFields] = useState<string[]>(['date_of_birth', 'allergies', 'medications'])
  const [days, setDays] = useState(30)
  const [link, setLink] = useState('')
  const [error, setError] = useState('')

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter(x => x !== v) : [...list, v])

  async function share(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await createShare(familyId, {
        recipient, children: kids, household_fields: household, child_fields: kids.length ? childFields : [],
        expires_in_days: days,
      })
      setLink(res.url)
      setRecipient('')
      onShares([res.share, ...shares])
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function revoke(id: string) {
    const updated = await revokeShare(familyId, id)
    onShares(shares.map(s => (s.id === id ? updated : s)))
  }

  const savedKids = kit.children.filter(c => c.name.trim())

  return (
    <Section
      title="Share with a camp"
      divided
      description="Pick the kids and only the fields this camp asks for. They get a private link that expires; you can withdraw it any time and see when it was opened. Save your kit first."
      className="space-y-6"
    >
      <form onSubmit={share} className="space-y-5">
        <Input required aria-label="Who is it for?" placeholder="Who is it for? For example, Riverside STEM Camp" value={recipient} onChange={e => setRecipient(e.target.value)} />
        <Checks label="Kids" options={savedKids.map(c => [c.name, c.name])} chosen={kids} onToggle={v => toggle(kids, setKids, v)} />
        <Checks label="Household" options={Object.entries(HOUSEHOLD_LABELS)} chosen={household} onToggle={v => toggle(household, setHousehold, v)} />
        {kids.length > 0 && (
          <Checks label="For each kid" options={Object.entries(CHILD_LABELS)} chosen={childFields} onToggle={v => toggle(childFields, setChildFields, v)} />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Select fieldSize="sm" aria-label="Expires" value={days} onChange={e => setDays(Number(e.target.value))} className="w-auto">
            <option value={7}>Expires in 7 days</option>
            <option value={30}>Expires in 30 days</option>
            <option value={90}>Expires in 90 days</option>
          </Select>
          <Button type="submit">Create private link</Button>
          {error && <span className="text-small text-error">{error}</span>}
        </div>
        {link && (
          <Notice tone="warn" className="space-y-2">
            <p className="font-semibold">Copy this link now; it&rsquo;s shown only once.</p>
            <div className="flex items-center gap-2">
              <Input fieldSize="sm" readOnly aria-label="Share link" value={link} onFocus={e => e.target.select()} />
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(link)}>Copy</Button>
            </div>
          </Notice>
        )}
      </form>

      {shares.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {shares.map(s => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-small">
              <div>
                <p className="font-semibold text-ink">{s.recipient}</p>
                <p className="text-muted">
                  {s.fields_shared} of {s.fields_total} fields{s.children.length ? ` · ${s.children.join(', ')}` : ''} ·{' '}
                  {s.open_count ? `opened ${s.open_count} time${s.open_count === 1 ? '' : 's'}` : 'not opened yet'} ·{' '}
                  {s.active ? `expires ${new Date(s.expires_at).toLocaleDateString()}` : s.revoked_at ? 'withdrawn' : 'expired'}
                </p>
              </div>
              {s.active && <Button variant="danger" onClick={() => revoke(s.id)}>Withdraw</Button>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function Checks({ label, options, chosen, onToggle }: {
  label: string; options: Array<[string, string]>; chosen: string[]; onToggle: (v: string) => void
}) {
  if (!options.length) return null
  return (
    <fieldset>
      <legend className="mb-2 text-small font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([value, text]) => (
          <ChoiceChip key={value} checked={chosen.includes(value)} onChange={() => onToggle(value)}>{text}</ChoiceChip>
        ))}
      </div>
    </fieldset>
  )
}
