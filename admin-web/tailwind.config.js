/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#E6F0FF',
          100: '#CCE0FF',
          200: '#99C0FF',
          300: '#66A0FF',
          500: '#0066FF',
          600: '#0052CC',
          700: '#003D99',
        },
        accent: {
          50:  '#FFF3E6',
          100: '#FFE6CC',
          200: '#FFCC99',
          500: '#FF7A00',
          600: '#E06C00',
        },
        navy: {
          600: '#1A3050',
          700: '#112040',
          800: '#0A1628',
          900: '#07101F',
        },
        steel: {
          300: '#C8D6E5',
          400: '#8BA5BF',
          500: '#4A6B82',
          600: '#3A5572',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

