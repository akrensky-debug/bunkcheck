import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { SUPPORT_EMAIL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Help and Support | BunkCheck',
  description: 'Get help with BunkCheck on the web, in ChatGPT and in Claude.',
}

export default function SupportPage() {
  return (
    <LegalPage title="Help and support">
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and a person will reply within one
        business day. Tell us what you asked for and what went wrong; a screenshot helps.
      </p>

      <h2>Using BunkCheck in ChatGPT</h2>
      <ul>
        <li>Ask about summer camps in plain words, for example &quot;Find STEM day camps near Providence for my 8-year-old.&quot; ChatGPT may suggest BunkCheck, or you can type <strong>@BunkCheck</strong>.</li>
        <li>Results appear as camp cards. Open a card for details, or continue on BunkCheck to plan every week and save a family calendar.</li>
        <li>To disconnect, open ChatGPT settings, find BunkCheck in your apps, and remove it.</li>
      </ul>

      <h2>Using BunkCheck in Claude</h2>
      <ul>
        <li>Add BunkCheck from the connectors directory (Customize &gt; Connectors), then ask about camps. No sign-in is needed.</li>
        <li>Claude may ask before opening a BunkCheck link; that is expected.</li>
        <li>To remove it, open Customize &gt; Connectors and disconnect BunkCheck.</li>
      </ul>

      <h2>Common questions</h2>
      <ul>
        <li><strong>Where does BunkCheck work?</strong> The Northeast US today: CT, MA, ME, NH, NJ, NY, PA, RI and VT, starting with Providence and Boston.</li>
        <li><strong>Are the details right?</strong> Each camp shows whether it is verified by BunkCheck or the camp. Always confirm dates and prices with the camp before you pay.</li>
        <li><strong>Does BunkCheck see my ChatGPT or Claude conversation?</strong> No. It receives only the search details, such as town and age. See our <a href="/privacy">Privacy Policy</a>.</li>
        <li><strong>A camp&apos;s information is wrong.</strong> Email us with the camp name. Camp owners can <a href="/operators/claim">claim their listing</a> and correct it.</li>
        <li><strong>How do I delete my family&apos;s information?</strong> Use your account page, or email us.</li>
      </ul>
    </LegalPage>
  )
}
