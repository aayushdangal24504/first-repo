import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}', './electron/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Avenir Next"', '"Helvetica Neue"', 'ui-sans-serif', 'system-ui'],
        display: ['"Iowan Old Style"', '"New York"', 'Georgia', 'serif'],
        mono: ['"SF Mono"', 'Menlo', 'ui-monospace', 'SFMono-Regular']
      },
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        glow: 'rgb(var(--glow) / <alpha-value>)'
      },
      boxShadow: {
        glass: '0 24px 70px rgb(15 23 42 / 0.18)',
        soft: '0 16px 40px rgb(15 23 42 / 0.10)'
      },
      backdropBlur: {
        glass: '22px'
      }
    }
  },
  plugins: []
};

export default config;
