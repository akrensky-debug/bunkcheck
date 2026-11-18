import type { Metadata } from 'next'
import { HandRaiserForm } from '@/components/home/HandRaiser'
import { ExampleSummer, Promises } from '@/components/home/Landing'
import { Text, TextLink } from '@/components/ui'

// The public front door while the app itself lives on dev.bunkcheck.ai. On a hand-raiser host
// (lib/site-mode.ts) the middleware serves this page at "/".
export const metadata: Metadata = {
  title: 'Bunkcheck: AI summer camp planner for New England families',
  description: 'Find summer camps in New England, line up your weeks and get an email before registration opens. An AI planner built by parents. Grab your spot in line for when your state opens.',
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
          Built by parents. Bunkcheck is an AI planner that finds the summer camps, lines up your weeks and
          watches registration day.
        </p>
        <p className="mt-8 font-semibold text-ink">
          We&rsquo;re opening state by state, as we have room. Grab your spot in line for yours.
        </p>
        <div className="mt-4">
          <HandRaiserForm />
        </div>

        <div className="mt-16 space-y-16 sm:mt-24">
          <ExampleSummer title="What you&rsquo;re in line for" />
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
