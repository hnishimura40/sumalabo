/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter"',
          '"Noto Sans JP"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          50: '#f7f8fb',
          100: '#eef0f6',
          200: '#dbdfe9',
          500: '#5a6478',
          700: '#2c3344',
          900: '#0f1320',
        },
      },
      boxShadow: {
        soft: '0 4px 16px -8px rgba(15, 19, 32, 0.12)',
      },
    },
  },
  plugins: [],
};
