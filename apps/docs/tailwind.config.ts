import { type Config } from 'tailwindcss'
import typographyStyles from './typography'
import typographyPlugin from '@tailwindcss/typography'
import headlessuiPlugin from '@headlessui/tailwindcss'

export default {
  content: ['./src/**/*.{js,mjs,jsx,ts,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    fontSize: {
      '2xs': ['0.75rem', { lineHeight: '1.25rem' }],
      xs: ['0.8125rem', { lineHeight: '1.5rem' }],
      sm: ['0.875rem', { lineHeight: '1.5rem' }],
      base: ['1rem', { lineHeight: '1.75rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
      '7xl': ['4.5rem', { lineHeight: '1' }],
      '8xl': ['6rem', { lineHeight: '1' }],
      '9xl': ['8rem', { lineHeight: '1' }],
    },
    typography: typographyStyles,
    extend: {
      boxShadow: {
        glow: '0 0 4px rgb(0 0 0 / 0.1)',
      },
      maxWidth: {
        lg: '33rem',
        '2xl': '40rem',
        '3xl': '50rem',
        '5xl': '66rem',
      },
      opacity: {
        1: '0.01',
        2.5: '0.025',
        7.5: '0.075',
        15: '0.15',
      },
      colors: {
        'void-black': '#071117',
        'galaxy-blue': '#0E2230',
        'space-blue': {
          '50': '#F7FBFF',
          '100': '#E9F5FE',
          '200': '#AAD3F1',
          '300': '#83BFE9',
          '400': '#73B9EB',
          '500': '#4394CD',
          '600': '#3B7CA8',
          '700': '#306287',
          '800': '#1E3D54',
          '900': '#0E2230',
        },
        'folly-red-base': '#F8545C',
        'folly-red': {
          '50': '#FFF6F5',
          '100': '#FFEBEA',
          '200': '#FFABA7',
          '300': '#FF8A88',
          '400': '#FF6A6E',
          '500': '#ED424C',
          '600': '#D53243',
          '700': '#B81C33',
          '800': '#970E26',
          '900': '#740D1D',
        },
      },
      fontFamily: {
        'styrene-a': ['var(--font-styrene-a)'],
        'ark-project': ['var(--font-ark-project)'],
      },
    },
  },
  plugins: [typographyPlugin, headlessuiPlugin],
} satisfies Config
