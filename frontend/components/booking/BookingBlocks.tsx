import { STATUS_LABEL, STATUS_TONE, countdown, type PackagePreview, type RegisterChecklist, type Registration } from '@/lib/booking'
import { Button, List, ListRow, Meta, Notice, cx } from '@/components/ui'

export type BookingUIData =
  | { type: 'registrations'; registrations: Registration[] }
  | { type: 'register_checklist'; checklist: RegisterChecklist }
  | { type: 'registration_package'; package: PackagePreview; registration_id: string | null }

function RegistrationList({ registrations }: { registrations: Registration[] }) {
  const shown = registrations.filter(r => r.status !== 'cancelled')
  if (!shown.length) return null
  return (
    <List>
      {shown.map(r => (
        <ListRow key={r.id} href="/registrations" density="compact">
          <div className="flex justify-between gap-4 text-small">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{r.camp_name}{r.child_name ? ` · ${r.child_name}` : ''}</p>
              <p className="text-muted">{r.status === 'watching' && r.opens_at ? countdown(r.opens_at) : r.next_step}</p>
            </div>
            <span className={cx('shrink-0 font-semibold', STATUS_TONE[r.status])}>{STATUS_LABEL[r.status]}</span>
          </div>
        </ListRow>
      ))}
    </List>
  )
}

function ChecklistCard({ c }: { c: RegisterChecklist }) {
  const missing = c.form.fields.filter(f => f.required && f.ready === false).length
  const href = `/register/${c.camp_id}?${new URLSearchParams({
    ...(c.registration ? { registration: c.registration.id } : {}), ...(c.session_id ? { session: c.session_id } : {}),
  })}`
  return (
    <div className="space-y-3 border-y border-line py-5">
      <h3 className="font-display text-h3 text-ink">Register for {c.camp_name}</h3>
      <Meta parts={[
        c.opens_at ? countdown(c.opens_at) : 'Opening date not known',
        c.kit_available && (missing ? `${missing} answer${missing === 1 ? '' : 's'} missing from your kit` : 'Your kit is ready'),
      ]} />
      <div className="flex flex-wrap items-center gap-4">
        <Button href={href} size="sm">Open checklist</Button>
        {c.registration_url && <Button href={c.registration_url} external variant="link" icon="external">Camp&rsquo;s registration</Button>}
      </div>
    </div>
  )
}

function PackageCard({ p, registrationId }: { p: PackagePreview; registrationId: string | null }) {
  const fields = [...p.household_fields, ...p.child_fields].map(f => p.labels[f] ?? f)
  const q = registrationId ? `?registration=${registrationId}` : ''
  return (
    <div className="space-y-3 border-y border-line py-5 text-small">
      <h3 className="font-display text-h3 text-ink">Package for {p.recipient}</h3>
      <p className="text-muted">Not shared yet. {fields.join(', ')}</p>
      {p.missing.length > 0 && <Notice tone="warn">Missing from your kit: {p.missing.join(', ')}</Notice>}
      <Button href={`/register/${p.camp_id}${q}`} size="sm">Review and share</Button>
    </div>
  )
}

export function BookingBlock({ data }: { data: BookingUIData }) {
  switch (data.type) {
    case 'registrations':        return <RegistrationList registrations={data.registrations} />
    case 'register_checklist':   return <ChecklistCard c={data.checklist} />
    case 'registration_package': return <PackageCard p={data.package} registrationId={data.registration_id} />
  }
}
