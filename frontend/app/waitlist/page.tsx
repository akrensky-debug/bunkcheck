import type { Metadata } from 'next'
import { HandRaiserForm } from '@/components/home/HandRaiser'
import { ExampleSummer, Promises } from '@/components/home/Landing'
import { Band, Text, TextLink } from '@/components/ui'

// The public front door while the app itself lives on dev.bunkcheck.ai. On a hand-raiser host
// (lib/site-mode.ts) the middleware serves this page at "/".
export const metadata: Metadata = {
  title: 'Bunkcheck: AI summer camp planner for New England families',
  description: 'An AI summer camp planner built by parents. More than 450 New England camps in one place. Opening state by state.',
  alternates: { canonical: '/' },
}

export default function HandRaiserPage() {
  return (
    <div className="mx-auto max-w-wide px-4 sm:px-6">
      <div className="mx-auto w-full max-w-narrow pb-16 pt-8 sm:pt-20 lg:pt-24">
        <h1 className="font-display text-display text-ink">
          {/* Three lines, broken where the sentence turns. Only a phone narrower than 360px wraps one. */}
          <span className="block">Planning summer</span>
          <span className="block">shouldn&rsquo;t take</span>
          <span className="marker whitespace-nowrap">all winter.</span>
        </h1>
        {/* Andrew's copy, 19 November 2026, edited 20 November for the waitlist review. 457 active camps in the live database both days. */}
        <p className="mt-5 max-w-measure text-lead text-muted">
          Bunkcheck takes the legwork out of summer camp wrangling. More than 450 summer camps, with
          their latest dates, costs and details, all in one place. Soon you&rsquo;ll plan and schedule the whole
          summer in a fraction of the time.
        </p>
        <p className="mt-4 max-w-measure text-lead text-muted">
          And when registration opens at 10 a.m. on a Tuesday, we&rsquo;ll make sure to remind you.
        </p>
        <p className="mt-4 max-w-measure text-small text-muted">
          <span className="font-semibold text-ink">Camps listed across New England</span> (CT, MA, ME, NH, RI and VT).
          The planner opens state by state, starting here.
        </p>
        <p className="mt-8 font-semibold text-ink">
          Want a spot when we open in your state?
        </p>
        <div className="mt-4">
          <HandRaiserForm />
        </div>

        {/* Show the product on tint, then the promises on navy, back to back; then paper. */}
        <div className="mt-16 sm:mt-24">
          <Band tone="tint"><ExampleSummer title="What you&rsquo;re in line for" /></Band>
          <Promises />
          <div className="pt-12">
            <Text variant="small" tone="muted">
              Run a camp? <TextLink href="/operators">Listing is free</TextLink>
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
