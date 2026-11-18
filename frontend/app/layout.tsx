import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './fonts.css'
import './globals.css'
import AccountLink from '@/components/AccountLink'
import { HANDRAISER_HOSTS } from '@/lib/site-mode'

// Figtree's Latin subset, served from the repo so the build never downloads fonts.
// One variable file (weights 300 to 900, from Google Fonts v9); licence in app/fonts/OFL.txt.
const figtree = localFont({
  src: './fonts/figtree-latin.woff2',
  weight: '700 800',
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bunkcheck: AI summer camp planner for New England families',
  description: 'Find summer camps in New England, line up your weeks and get an email before registration opens. An AI planner built by parents.',
  applicationName: 'Bunkcheck',
  // favicon.ico, icon.svg and apple-icon.png in app/ are wired automatically by Next;
  // /icon.png is the 512 px app icon the assistant apps also point at.
  icons: { icon: '/icon.png', apple: '/icon.png' },
  openGraph: {
    title: 'Bunkcheck: AI summer camp planner for New England families',
    description: 'Find summer camps in New England, line up your weeks and get an email before registration opens. An AI planner built by parents.',
    siteName: 'Bunkcheck',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#F7F5F0', // ui-check-ignore: metadata needs a literal; matches --bg
}

// Marks <html> on a hand-raiser host. The host list is fixed at build time.
const HANDRAISER_SCRIPT = `(function(){if(${JSON.stringify(HANDRAISER_HOSTS)}.indexOf(location.hostname)>-1)document.documentElement.setAttribute('data-handraiser','')})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <head>
        {/* Atkinson Hyperlegible Next (body) is served from public/fonts; rules in fonts.css.
            next/font/local can't split a font by character, so it isn't used for this one.
            Preload the face every page needs first. Figtree preloads through next/font. */}
        <link rel="preload" href="/fonts/atkinson-hyperlegible-next-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* On a hand-raiser host (lib/site-mode.ts) the app's own links are hidden. Set before first
            paint, so pages stay static and nothing flickers. The rule is in globals.css. */}
        <script dangerouslySetInnerHTML={{ __html: HANDRAISER_SCRIPT }} />
      </head>
      <body className="min-h-dvh flex flex-col">
        <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-wide items-center justify-between gap-4 px-4 sm:px-6">
            <a href="/" className="flex shrink-0 items-center" aria-label="Bunkcheck home">
              {/* Phones get the mark alone: the full lockup and three links need about 423px. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/bunkcheck-icon.svg" alt="Bunkcheck" width={28} height={28} className="h-7 w-7 sm:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/bunkcheck-lockup-light-small.svg"
                alt="Bunkcheck"
                width={160}
                height={28}
                className="hidden h-7 w-auto sm:block"
              />
            </a>
            <nav aria-label="Main" className="flex items-center gap-4 text-small font-semibold sm:gap-7">
              <a href="/summer" data-app-only className="py-3 text-muted transition-colors hover:text-ink whitespace-nowrap">Your summer</a>
              <a href="/search" data-app-only className="py-3 text-muted transition-colors hover:text-ink whitespace-nowrap">
                <span className="sm:hidden">Camps</span>
                <span className="hidden sm:inline">Browse camps</span>
              </a>
              <a href="/connect" data-app-only className="hidden py-3 text-muted transition-colors hover:text-ink whitespace-nowrap md:inline">Use in Claude</a>
              <a href="/operators" data-public-nav className="hidden py-3 text-muted transition-colors hover:text-ink whitespace-nowrap sm:inline">For camps</a>
              <span data-app-only><AccountLink /></span>
            </nav>
          </div>
        </header>
        <main className="flex-1 animate-fade">{children}</main>
        <footer className="mt-24 border-t border-line">
          <div className="mx-auto flex max-w-wide flex-col gap-10 px-4 py-12 text-small sm:px-6 md:flex-row md:justify-between">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/bunkcheck-lockup-light-small.svg"
                alt="Bunkcheck"
                width={160}
                height={28}
                className="mb-3 h-6 w-auto"
              />
              <p className="text-muted">Summer shouldn&rsquo;t take all winter.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-3">
              <FooterColumn appOnly title="Parents" links={[['/', 'Plan your summer'], ['/summer', 'Your summer board'], ['/search', 'Browse camps'], ['/connect', 'Use Bunkcheck in Claude']]} />
              <FooterColumn title="Camps" links={[['/operators', 'For camps'], ['/operators/submit', 'List your camp'], ['/operators/claim', 'Claim your listing']]} />
              <FooterColumn title="Help" links={[['/support', 'Support'], ['/ranking', 'How we rank'], ['/privacy', 'Privacy'], ['/terms', 'Terms']]} />
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}

function FooterColumn({ title, links, appOnly = false }: { title: string; links: Array<[string, string]>; appOnly?: boolean }) {
  return (
    <div className="space-y-2" {...(appOnly ? { 'data-app-only': '' } : {})}>
      <p className="font-semibold text-ink">{title}</p>
      {links.map(([href, label]) => (
        <a key={href} href={href} className="block text-muted transition-colors hover:text-ink">{label}</a>
      ))}
    </div>
  )
}
