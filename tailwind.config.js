/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#0B1120',
          card: '#151B2B',
          hover: '#1C2333',
        },
      },
    },
  },
  plugins: [],
};