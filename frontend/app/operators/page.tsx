"use client"

import React from 'react'
import { Events } from '@/lib/analytics'
import { Button, Container, Heading, Text } from '@/components/ui'

export default function OperatorsPage() {
  return (
    <Container size="narrow" className="py-16 sm:py-24">
      <Heading level="h1" className="mb-5">Get discovered by the parents who are already searching</Heading>
      <Text variant="lead" tone="muted" className="mb-16">
        Parents plan their summer with Bunkcheck on the web, in ChatGPT and in Claude. Make sure they find your camp,
        with dates and prices you&rsquo;ve checked.
      </Text>
      <div className="grid gap-12 border-t border-line pt-10 sm:grid-cols-2">
        <section className="flex flex-col">
          <Heading level="h2" className="mb-2">List your camp</Heading>
          <Text tone="muted" className="mb-6 flex-1">Not on Bunkcheck yet? Submit your camp for free.</Text>
          <Button
            href="/operators/submit"
            onClick={() => Events.campSubmissionStarted()}
            className="self-start"
          >
            Submit your camp
          </Button>
        </section>
        <section className="flex flex-col">
          <Heading level="h2" className="mb-2">Claim your listing</Heading>
          <Text tone="muted" className="mb-6 flex-1">Already listed? Claim your camp to update sessions and pricing.</Text>
          <Button
            href="/operators/claim"
            variant="secondary"
            onClick={() => Events.claimFlowStarted("operator_page")}
            className="self-start"
          >
            Claim your listing
          </Button>
        </section>
      </div>
    </Container>
  )
}
