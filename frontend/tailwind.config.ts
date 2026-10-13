import type { Config } from 'tailwindcss'

// Bunkcheck brand tokens. Night navy is the brand/ink colour; flashlight yellow is an
// accent for fills only (never text on light backgrounds); checked green is reserved
// for verified status.
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Navy-based scale (600 = night navy #14213D).
        brand: {
          50:  '#EEF0F5',
          100: '#DFE3EC',
          200: '#C5CCDB',
          300: '#9CA6BD',
          400: '#5F6B88',
          500: '#33415F',
          600: '#14213D',
          700: '#0F1A30',
          800: '#0B1426',
          900: '#070D1A',
        },
        navy:       '#14213D',
        night:      '#0F1A30',
        tile:       '#1B2B52',
        offwhite:   '#EEF0F5',
        flashlight: { DEFAULT: '#F5D96B', soft: '#FBF0C4', deep: '#E9C843' },
        paper:      '#F7F5F0',
        line:       '#E2DED4',
        muted:      '#565E70',
        checked:    { DEFAULT: '#2E6B3F', soft: '#E3EFE5' },
        // Warm neutrals tuned to the paper background; 400+ pass AA on white and paper.
        gray: {
          50:  '#F3F1EB',
          100: '#ECE9E1',
          200: '#E2DED4',
          300: '#CDC8BC',
          400: '#5F6676',
          500: '#565E70',
          600: '#454C5D',
          700: '#343B4B',
          800: '#232A3A',
          900: '#14213D',
        },
        green: {
          50:  '#E3EFE5',
          100: '#E3EFE5',
          200: '#C4DCCA',
          600: '#2E6B3F',
          700: '#265934',
          800: '#2E6B3F',
        },
        red: {
          50:  '#FEF3F2',
          200: '#FECDCA',
          500: '#B42318',
          600: '#B42318',
          700: '#912018',
        },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', '"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Figtree', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        '2xl': '14px',
      },
      boxShadow: {
        lift: '0 10px 24px -12px rgba(20, 33, 61, 0.28)',
      },
      keyframes: {
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'draw-check': { from: { strokeDashoffset: '1' }, to: { strokeDashoffset: '0' } },
        'week-fill': {
          from: { transform: 'scaleY(0)' },
          to:   { transform: 'scaleY(1)' },
        },
        'pop': {
          '0%':   { transform: 'scale(0.6)', opacity: '0' },
          '60%':  { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'rise-in':    'rise-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in':    'fade-in 0.5s ease-out both',
        'draw-check': 'draw-check 0.7s cubic-bezier(0.65, 0, 0.35, 1) 0.35s both',
        'week-fill':  'week-fill 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop':        'pop 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
export default config
