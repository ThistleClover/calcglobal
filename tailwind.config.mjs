import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Geist', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        parchment: {
          50: '#fcfbf8',
          100: '#f8f6f0',   // Base Canvas (light)
          200: '#f0eee8',   // Container Low / Sub-surface
          300: '#e7e2d7',   // Stone Border
          400: '#dcdad4',
          500: '#78716c',   // Secondary Text
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',   // Deep Charcoal Ink
          950: '#0f0e0c',   // Deep Dark Canvas
        },
        ivory: {
          surface: '#fdfcf9',    // Warm Ivory Card (light)
          card: '#fdfcf9',
          border: '#e7e2d7',
          darkCanvas: '#0f0e0c', // Deep espresso dark base
          darkCard: '#1a1816',   // Dark warm card
          darkSurface: '#252220', // Dark sub-surface
          darkBorder: '#2a2622', // Dark border (warmer)
          darkInk: '#f5f2eb',
          darkMuted: '#a8a29e',
        },
        emeraldBrand: {
          DEFAULT: '#006948',
          light: '#059669',
          dark: '#005137',
          hover: '#005a3d',
          container: '#00855d',
          fixed: '#6ee7b7',  // Mint for dark mode accents
          subtle: '#ecfdf5',  // Ultra-subtle emerald bg
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'blur-in': 'blurIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blurIn: {
          '0%': { opacity: '0', filter: 'blur(8px)', transform: 'translateY(8px)' },
          '100%': { opacity: '1', filter: 'blur(0)', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'ambient': '0 1px 3px 0 rgba(28, 25, 23, 0.04), 0 1px 2px -1px rgba(28, 25, 23, 0.03)',
        'ambient-md': '0 4px 16px -2px rgba(28, 25, 23, 0.06), 0 2px 4px -2px rgba(28, 25, 23, 0.03)',
        'ambient-hover': '0 8px 24px -4px rgba(28, 25, 23, 0.08), 0 2px 6px -2px rgba(28, 25, 23, 0.04)',
        'dark-ambient': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
        'dark-ambient-md': '0 4px 16px -2px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'dark-hover': '0 8px 24px -4px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(0, 0, 0, 0.3)',
        'nav': '0 1px 2px 0 rgba(28, 25, 23, 0.03)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [typography],
}
