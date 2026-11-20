import type { Metadata } from 'next'
import { HandRaiserForm } from '@/components/home/HandRaiser'
import { ExampleSummer, Promises } from '@/components/home/Landing'
import { Text, TextLink } from '@/components/ui'

// The public front door while the app itself lives on dev.bunkcheck.ai. On a hand-raiser host
// (lib/site-mode.ts) the middleware serves this page at "/".
export const metadata: Metadata = {
  title: 'Bunkcheck: AI summer camp planner for New England families',
  description: 'An AI summer camp planner built by parents. Plan, book and schedule your family’s summer in a fraction of the time. Opening in New England one state at a time.',
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
        {/* Andrew's copy, 19 November 2026. 457 active camps in the live database that day. */}
        <p className="mt-5 max-w-measure text-lead text-muted">
          Bunkcheck was created to take the legwork out of summer camp wrangling. More than 450 summer camps, with
          their latest dates, costs and details, all in one place. Now you can plan, book and schedule the whole
          summer in a fraction of the time.
        </p>
        <p className="mt-4 max-w-measure text-lead text-muted">
          And when registration opens at 10 a.m. on a Tuesday, we&rsquo;ll make sure to remind you.
        </p>
        <p className="mt-4 max-w-measure text-small text-muted">
          <span className="font-semibold text-ink">Currently available in New England</span> (CT, MA, ME, NH, RI and VT)
          and rolling out to other states soon.
        </p>
        <p className="mt-8 font-semibold text-ink">
          Want us to save you a spot for when your state opens?
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
