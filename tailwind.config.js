// tailwind.config.js
const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,html}',
    './public/index.html',
  ],
  theme: {
    extend: {
      colors: {
        /* === PayHive brand === */
        brand: {
          DEFAULT: '#303234',   // Charcoal (wordmark)
          hover:   '#242628',   // Darker hover
          accent:  '#FFB547',   // Mid orange (chips/icons)
          honey:   '#FFD36E',   // Gradient start
          orange:  '#F68F1E',   // Gradient end
        },

        /* Keep your existing semantic tokens but point them at the brand */
        primary:   '#303234',   // alias -> brand.DEFAULT
        secondary: '#FFB547',   // alias -> brand.accent
        tertiary:  '#F6F7F9',   // subtle bg (light grey)
        dark:      '#303234',
        light:     '#FFFFFF',
        muted:     '#9CA3AF',   // neutral for disabled/text-secondary
      },

      /* One-liners for common gradients */
      backgroundImage: {
        'brand-diag': 'linear-gradient(135deg, #FFD36E, #F68F1E)',  // card/header
        'brand-vert': 'linear-gradient(to bottom, #FFD36E0D, #F68F1E08, white)', // page wash
      },

      borderRadius: {
        sm: '4px',
        md: '8px',
      },

      fontFamily: {
        heading: ['Inter', ...fontFamily.sans],
        body: ['Inter', ...fontFamily.sans],
      },

      fontSize: {
        h1: ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }], // 36px
        h2: ['1.75rem', { lineHeight: '2.25rem', fontWeight: '600' }], // 28px
        body: ['1rem', { lineHeight: '1.5rem' }], // 16px
        caption: ['0.75rem', { lineHeight: '1rem' }], // 12px
      },
    },
  },
  plugins: [],
};
