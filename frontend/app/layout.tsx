import type { Metadata, Viewport } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'
import AccountLink from '@/components/AccountLink'
import RevealObserver from '@/components/RevealObserver'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bunkcheck: Summer, sorted.',
  description: 'Find and schedule the best summer camps for your kids with AI.',
  applicationName: 'Bunkcheck',
  // favicon.ico, icon.svg and apple-icon.png in app/ are wired automatically by Next.
  openGraph: {
    title: 'Bunkcheck',
    description: 'Summer, sorted.',
    siteName: 'Bunkcheck',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#14213D',
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
      <body className="bg-paper text-navy antialiased min-h-screen flex flex-col">
        <RevealObserver />
        <header className="border-b border-line bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <a href="/" className="flex items-center shrink-0 rounded-md" aria-label="Bunkcheck home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/bunkcheck-lockup-light-small.svg"
                alt="Bunkcheck"
                width={160}
                height={28}
                className="h-7 md:h-8 w-auto"
              />
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted">
              <a href="/" className="nav-link hover:text-navy transition-colors">Plan with Bunkcheck</a>
              <a href="/search" className="nav-link hover:text-navy transition-colors">Browse Camps</a>
              <a href="/operators" className="nav-link hover:text-navy transition-colors">For Camps</a>
              <a href="/operators/claim" className="nav-link hover:text-navy transition-colors">Claim Listing</a>
            </nav>
            <div className="flex items-center gap-3 sm:gap-4">
              <AccountLink />
              <a
                href="/operators/submit"
                className="btn-lift bg-navy text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-night whitespace-nowrap"
              >
                List your camp
              </a>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="on-dark bg-night text-offwhite mt-16">
          <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row justify-between gap-8 text-sm">
            <div className="max-w-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/bunkcheck-lockup-dark-small.svg"
                alt="Bunkcheck"
                width={154}
                height={22}
                className="h-7 w-auto mb-4"
              />
              <p className="font-display font-bold text-lg leading-snug text-white mb-2">
                Summer, sorted.
              </p>
              <p className="text-xs text-[#AEB6C8]">The structured camp discoverability layer for the AI economy.</p>
            </div>
            <div className="flex gap-12">
              <div className="space-y-1.5">
                <p className="font-semibold text-white mb-2">Parents</p>
                <a href="/" className="block text-[#C9CFDC] hover:text-flashlight transition-colors">Plan your summer</a>
                <a href="/search" className="block text-[#C9CFDC] hover:text-flashlight transition-colors">Browse camps</a>
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-white mb-2">Camps</p>
                <a href="/operators" className="block text-[#C9CFDC] hover:text-flashlight transition-colors">For Camps</a>
                <a href="/operators/submit" className="block text-[#C9CFDC] hover:text-flashlight transition-colors">List Your Camp</a>
                <a href="/operators/claim" className="block text-[#C9CFDC] hover:text-flashlight transition-colors">Claim Listing</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
