import type { Metadata } from 'next'
import { HandRaiserForm } from '@/components/home/HandRaiser'
import { ExampleSummer, Promises } from '@/components/home/Landing'
import { Text, TextLink } from '@/components/ui'

// The public front door while the app itself lives on dev.bunkcheck.ai. On a hand-raiser host
// (lib/site-mode.ts) the middleware serves this page at "/".
export const metadata: Metadata = {
  title: 'Bunkcheck: planning summer shouldn’t take all winter',
  description: 'An AI-powered tool, built by parents, that makes it easier to plan and book your kids’ summer. Raise your hand and we’ll tell you when it opens near you.',
  alternates: { canonical: '/' },
}

export default function HandRaiserPage() {
  return (
    <div className="mx-auto max-w-wide px-4 sm:px-6">
      <div className="mx-auto w-full max-w-narrow pb-16 pt-8 sm:pt-20 lg:pt-24">
        <h1 className="font-display text-display text-ink text-balance lg:-mr-48">
          Planning summer shouldn&rsquo;t take{' '}
          <span className="marker whitespace-nowrap">all winter.</span>
        </h1>
        <p className="mt-5 max-w-measure text-lead text-muted">
          Bunkcheck is an AI-powered tool, built by parents, that makes it easier to plan and book your
          kids&rsquo; summer.
        </p>
        <p className="mt-8 font-semibold text-ink">
          We&rsquo;re not open to everyone yet. Raise your hand and we&rsquo;ll tell you when Bunkcheck opens near you.
        </p>
        <div className="mt-4">
          <HandRaiserForm />
        </div>

        <div className="mt-16 space-y-16 sm:mt-24">
          <ExampleSummer />
          <Promises />
          <div className="border-t border-line pt-8">
            <Text variant="small" tone="muted">
              Run a camp? <TextLink href="/operators">Listing is free</TextLink>
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
