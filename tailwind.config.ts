import type { Config } from 'tailwindcss';

/**
 * Every value resolves to a CSS custom property declared in app/globals.css,
 * so theme switching and the inverted `.band` sections happen entirely in CSS
 * with no class swapping and no duplicated palette.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      paper: 'var(--paper)',
      surface: 'var(--surface)',
      'surface-2': 'var(--surface-2)',
      'paper-2': 'var(--paper-2)',
      brand: 'var(--brand)',
      'on-brand': 'var(--on-brand)',
      'on-mint': 'var(--on-mint)',
      mint: 'var(--mint)',
      cyan: 'var(--cyan)',
      ink: 'var(--ink)',
      'ink-2': 'var(--ink-2)',
      'ink-3': 'var(--ink-3)',
      rule: 'var(--rule)',
      'rule-2': 'var(--rule-2)',
      best: 'var(--best)',
      'best-soft': 'var(--best-soft)',
      caution: 'var(--caution)',
      'caution-soft': 'var(--caution-soft)',
      absent: 'var(--absent)',
      focus: 'var(--focus)',
    },
    spacing: {
      0: '0px',
      px: '1px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
      24: '96px',
      32: '128px',
    },
    borderRadius: {
      none: '0',
      sm: 'var(--radius-sm)',
      DEFAULT: 'var(--radius-sm)',
      card: 'var(--radius-card)',
      pill: 'var(--radius-pill)',
      full: '9999px',
    },
    fontFamily: {
      sans: ['var(--font-ui)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      display: ['var(--font-display)', 'var(--font-ui)', 'sans-serif'],
      mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      xs: ['var(--text-xs)', { lineHeight: '1.45' }],
      sm: ['var(--text-sm)', { lineHeight: '1.5' }],
      base: ['var(--text-base)', { lineHeight: '1.55' }],
      lg: ['var(--text-lg)', { lineHeight: '1.4' }],
      lead: ['var(--text-lead)', { lineHeight: '1.33' }],
      xl: ['var(--text-xl)', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
      '2xl': ['var(--text-2xl)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      '3xl': ['var(--text-3xl)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      display: ['var(--text-display)', { lineHeight: '1', letterSpacing: '-0.02em' }],
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    extend: {
      maxWidth: {
        content: 'var(--measure-content)',
        page: 'var(--measure-page)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'row-in': {
          from: { opacity: '0', transform: 'translateY(3px)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'expand-down': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'row-in': 'row-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'expand-down': 'expand-down 140ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
