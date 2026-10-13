import { Container, Heading } from '@/components/ui'

/** Long-form reading pages (privacy, terms, support): one column at a readable measure. */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <Container size="narrow" className="py-16 sm:py-24">
      <Heading level="h1" className="mb-3">{title}</Heading>
      {updated && <p className="mb-10 text-small text-muted">Last updated {updated}</p>}
      <div className="max-w-measure space-y-4 text-body text-ink [&_a]:font-semibold [&_a]:underline [&_a]:decoration-line [&_a]:underline-offset-4 hover:[&_a]:decoration-ink [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-h2 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </Container>
  )
}
