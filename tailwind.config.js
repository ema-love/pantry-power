/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#F3F5EF',
          100: '#E4E9DC',
          200: '#C9D3BA',
          300: '#A7B89A',
          400: '#7F9470',
          500: '#5E7550',
          600: '#465B3D',
          700: '#384A31',
          800: '#2C3A27',
          900: '#20291D',
        },
        sage: { DEFAULT: '#A7B89A', light: '#DCE4D3' },
        ivory: '#FAF8F2',
        cream: { DEFAULT: '#F1EEE4', dark: '#E6E1D3' },
        terracotta: { 50: '#F8EEE8', 100: '#F0DCD0', DEFAULT: '#B9795D', 600: '#9E6147', 700: '#82503A' },
        charcoal: '#292D27',
        stone: { warm: '#6F6B62', light: '#9A958A' },
        line: '#E5E0D3',
        amber: { soft: '#F6EBD3', DEFAULT: '#C2913A', deep: '#8A6420' },
        danger: { soft: '#F6E2DE', DEFAULT: '#B5524A', deep: '#8F3C35' },
      },
      fontFamily: {
        sans: ['"Manrope Variable"', 'Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(41,45,39,0.04), 0 2px 8px rgba(41,45,39,0.04)',
        lift: '0 4px 20px rgba(41,45,39,0.10)',
        sheet: '0 -8px 40px rgba(41,45,39,0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
