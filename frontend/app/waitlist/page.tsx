import type { Metadata } from 'next'
import { HandRaiserForm } from '@/components/home/HandRaiser'
import { ExampleSummer, HeroSummer, Promises } from '@/components/home/Landing'
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
      <div className="mx-auto w-full max-w-narrow pb-16 pt-8 sm:pt-20 lg:max-w-none lg:pt-24">
        <h1 className="font-display text-display text-ink text-balance">
          Planning summer shouldn&rsquo;t take{' '}
          <span className="marker whitespace-nowrap">all winter.</span>
        </h1>
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-12">
        <div>
        <p className="mt-5 max-w-measure text-lead text-muted">
          We&rsquo;re parents too. Bunkcheck does the legwork: more than 450 summer camps, with their schedules,
          costs and details, in one place. You plan, book and schedule the whole summer in a fraction of the time.
        </p>
        <p className="mt-4 max-w-measure text-small text-muted">
          <span className="font-semibold text-ink">Now in New England:</span> CT, MA, ME, NH, RI and VT, with the most camps around Boston and Providence.
        </p>
        <p className="mt-4 max-w-measure text-lead text-muted">
          And registration seems to open at 10 a.m. on a Thursday, right when you&rsquo;re in a meeting. We&rsquo;ll
          keep an eye on it for you.
        </p>
        <p className="mt-8 font-semibold text-ink">
          We&rsquo;re opening one state at a time, so there&rsquo;s a line. Want us to save you a spot?
        </p>
        <div className="mt-4">
          <HandRaiserForm />
        </div>
        </div>
        <HeroSummer className="mt-6" />
        </div>

        <div className="mt-16 space-y-16 sm:mt-24">
          <div className="lg:hidden"><ExampleSummer title="What you&rsquo;re in line for" /></div>
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
