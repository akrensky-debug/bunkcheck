import type { Config } from 'tailwindcss'

// Bunkcheck design tokens. The values live as CSS variables in app/globals.css (:root), so a
// dark theme can be added later by redefining them. Pages use these role names only; the
// default Tailwind palette, radii, shadows and type sizes are replaced, not extended.
// See components/ui/README.md.
const role = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      bg: role('bg'),                       // page background (paper)
      surface: role('surface'),             // white surfaces: inputs, the few containers
      ink: role('ink'),                     // text and icons (night navy)
      muted: role('muted'),                 // secondary text, AA on bg and surface
      line: role('line'),                   // hairlines and borders
      tint: role('tint'),                   // hover wash on rows and ghost buttons
      accent: {
        DEFAULT: role('accent'),            // primary buttons, user chat pill
        hover: role('accent-hover'),
        ink: role('accent-ink'),            // text on accent
      },
      highlight: {
        DEFAULT: role('highlight'),         // flashlight yellow: fills only, never text
        soft: role('highlight-soft'),
      },
      checked: {
        DEFAULT: role('checked'),           // verified, done, open
        soft: role('checked-soft'),
      },
      warn: role('warn'),                   // waitlist and "check this" text
      error: {
        DEFAULT: role('error'),
        soft: role('error-soft'),
      },
      focus: role('focus'),
      // One color per kid on the family week. Identity only, no meaning.
      series: {
        1: role('series-1'),
        2: role('series-2'),
        3: role('series-3'),
        4: role('series-4'),
        5: role('series-5'),
      },
    },
    fontSize: {
      display: ['clamp(3.5rem, 2.3rem + 4.6vw, 5.5rem)', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '800' }],
      h1: ['clamp(2rem, 1.7rem + 1.2vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '800' }],
      h2: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '700' }],
      h3: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
      lead: ['1.1875rem', { lineHeight: '1.6' }],
      body: ['1rem', { lineHeight: '1.65' }],
      small: ['0.875rem', { lineHeight: '1.55' }],
      caption: ['0.8125rem', { lineHeight: '1.45' }],
    },
    borderRadius: {
      none: '0',
      sm: '8px',
      md: '12px',
      lg: '16px',
      pill: '9999px',
    },
    boxShadow: {
      none: 'none',
      soft: '0 1px 2px rgb(var(--ink) / 0.04), 0 10px 30px -12px rgb(var(--ink) / 0.16)',
    },
    extend: {
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', '"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Figtree', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        narrow: '45rem',   // 720px: home column, forms, reading pages
        default: '64rem',  // 1024px: most pages
        wide: '72rem',     // 1152px: header, footer, home with side column
        measure: '65ch',   // longest comfortable line of body text
      },
      minHeight: {
        page: 'calc(100vh - 4rem)', // viewport minus the 64px header
      },
      keyframes: {
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        fade: 'fade 180ms ease-out both',
      },
    },
  },
  plugins: [],
}
export default config
