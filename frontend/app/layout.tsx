import type { Metadata, Viewport } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'
import AccountLink from '@/components/AccountLink'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bunkcheck: Summer, sorted.',
  description: 'Find and schedule the best summer camps for your kids with AI, and get an email when registration opens.',
  applicationName: 'Bunkcheck',
  // favicon.ico, icon.svg and apple-icon.png in app/ are wired automatically by Next;
  // /icon.png is the 512 px app icon the assistant apps also point at.
  icons: { icon: '/icon.png', apple: '/icon.png' },
  openGraph: {
    title: 'Bunkcheck',
    description: 'Summer, sorted.',
    siteName: 'Bunkcheck',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#F7F5F0', // ui-check-ignore: metadata needs a literal; matches --bg
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={figtree.variable}>
      <head>
        {/* Atkinson Hyperlegible Next is not in next/font for Next 14.2, so it loads from Google Fonts. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-wide items-center justify-between gap-4 px-4 sm:px-6">
            <a href="/" className="flex shrink-0 items-center" aria-label="Bunkcheck home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/bunkcheck-lockup-light-small.svg"
                alt="Bunkcheck"
                width={160}
                height={28}
                className="h-6 w-auto sm:h-7"
              />
            </a>
            <nav aria-label="Main" className="flex items-center gap-4 text-small font-semibold sm:gap-7">
              <a href="/search" className="text-muted transition-colors hover:text-ink whitespace-nowrap">Browse camps</a>
              <a href="/operators" className="hidden text-muted transition-colors hover:text-ink whitespace-nowrap sm:inline">For camps</a>
              <AccountLink />
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
              <p className="text-muted">Summer, sorted.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-3">
              <FooterColumn title="Parents" links={[['/', 'Plan your summer'], ['/search', 'Browse camps']]} />
              <FooterColumn title="Camps" links={[['/operators', 'For camps'], ['/operators/submit', 'List your camp'], ['/operators/claim', 'Claim your listing']]} />
              <FooterColumn title="Help" links={[['/support', 'Support'], ['/privacy', 'Privacy'], ['/terms', 'Terms']]} />
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div className="space-y-2">
      <p className="font-semibold text-ink">{title}</p>
      {links.map(([href, label]) => (
        <a key={href} href={href} className="block text-muted transition-colors hover:text-ink">{label}</a>
      ))}
    </div>
  )
}
