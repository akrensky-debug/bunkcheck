import type { Metadata } from 'next'
import { HandRaiserForm } from '@/components/home/HandRaiser'
import { ExampleSummer, Promises } from '@/components/home/Landing'
import { Text, TextLink } from '@/components/ui'

// The public front door while the app itself lives on dev.bunkcheck.ai. On a hand-raiser host
// (lib/site-mode.ts) the middleware serves this page at "/".
export const metadata: Metadata = {
  title: 'Bunkcheck: AI summer camp planner for New England families',
  description: 'Find summer camps in New England, line up your weeks and get an email before registration opens. An AI planner built by parents. We’re opening one state at a time, and we’d love to save you a spot.',
  alternates: { canonical: '/' },
}

export default function HandRaiserPage() {
  return (
    <div className="mx-auto max-w-wide px-4 sm:px-6">
      <div className="mx-auto w-full max-w-narrow pb-16 pt-8 sm:pt-20 lg:pt-24">
        <h1 className="font-display text-display text-ink text-balance lg:-mr-48">
          Planning summer takes{' '}
          <span className="marker whitespace-nowrap">all winter.</span>
        </h1>
        <p className="mt-5 max-w-measure text-lead text-muted">
          We&rsquo;ve read more than 450 camp websites so you don&rsquo;t have to. Bunkcheck is built by parents,
          with AI to do the legwork.
        </p>
        <p className="mt-4 max-w-measure text-lead text-muted">
          Registration opens at 10 a.m. on a Thursday, when you&rsquo;re in a meeting. We&rsquo;ll be watching
          for you.
        </p>
        <p className="mt-8 font-semibold text-ink">
          We&rsquo;re opening one state at a time, so there&rsquo;s a line. We&rsquo;d love to save you a spot.
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
