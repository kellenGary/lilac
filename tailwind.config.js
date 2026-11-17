/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode here is our own palette (src/theme/palettes.ts), not Tailwind's `dark:` variant. 'class' (not the default
  // 'media') also stops NativeWind's web color-scheme observer from throwing.
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Themed: values come from CSS variables set by ThemeProvider (src/theme/palettes.ts).
        cream: 'rgb(var(--color-cream) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        purple: 'rgb(var(--color-purple) / <alpha-value>)',
        lilac: 'rgb(var(--color-lilac) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        body: 'rgb(var(--color-body) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        track: 'rgb(var(--color-track) / <alpha-value>)',
        edge: 'rgb(var(--color-edge) / <alpha-value>)',
        hint: 'rgb(var(--color-hint) / <alpha-value>)',
        sage: 'rgb(var(--color-sage) / <alpha-value>)',
        sageInk: 'rgb(var(--color-sageInk) / <alpha-value>)',
        sun: 'rgb(var(--color-sun) / <alpha-value>)',
        rose: 'rgb(var(--color-rose) / <alpha-value>)',
        roseInk: 'rgb(var(--color-roseInk) / <alpha-value>)',
        roseLine: 'rgb(var(--color-roseLine) / <alpha-value>)',
        roseSoft: 'rgb(var(--color-roseSoft) / <alpha-value>)',
        // Constant on both modes.
        depression: '#9A8660',
        anxiety: '#D98E45',
        meaning: '#6F9449',
      },
    },
  },
  plugins: [],
};
