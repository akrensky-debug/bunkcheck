"use client"

import React from 'react'
import { Events } from '@/lib/analytics'

export default function OperatorsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl md:text-4xl font-extrabold text-navy mb-4 animate-rise-in">
        Get discovered by the parents who are already searching
      </h1>
      <p className="text-lg text-muted max-w-2xl mb-10">
        Bunkcheck is built for AI-first discovery.
      </p>
      <div className="grid md:grid-cols-2 gap-6 mb-20">
        <div className="bg-white border border-line rounded-2xl p-8 flex flex-col" data-reveal>
          <div aria-hidden="true" className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-navy">
            <svg viewBox="0 0 16 16" className="h-5 w-5"><path d="M8 3.5 V12.5 M3.5 8 H12.5" fill="none" stroke="#F5D96B" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">List your camp</h2>
          <p className="text-muted text-sm flex-1 mb-6">
            Not yet on Bunkcheck? Submit your camp for free.
          </p>
          <a
            href="/operators/submit"
            onClick={() => Events.campSubmissionStarted()}
            className="block btn-lift bg-navy hover:bg-night text-white font-bold px-5 py-3 rounded-xl text-center"
          >
            Submit your camp
          </a>
        </div>
        <div className="bg-white border border-line rounded-2xl p-8 flex flex-col" data-reveal>
          <div aria-hidden="true" className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-navy">
            <svg viewBox="0 0 16 16" className="h-5 w-5"><path d="M3.5 8.5 L6.5 11.5 L12.5 4.5" fill="none" stroke="#F5D96B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">Claim your listing</h2>
          <p className="text-muted text-sm flex-1 mb-6">
            Already listed? Claim your camp to update sessions and pricing.
          </p>
          <a
            href="/operators/claim"
            onClick={() => Events.claimFlowStarted("operator_page")}
            className="btn-lift block bg-flashlight hover:bg-flashlight-deep text-navy font-bold px-5 py-3 rounded-xl text-center"
          >
            Claim your listing
          </a>
        </div>
      </div>
    </div>
  )
}
