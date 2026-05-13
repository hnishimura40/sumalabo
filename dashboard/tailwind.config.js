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
          // ink-800: 常時ダーク UI のカードサーフェス (背景 ink-900 から少し浮く色)
          800: '#151a2a',
          900: '#0f1320',
        },
      },
      boxShadow: {
        // 旧 soft (ライト前提) は残しつつ、ダーク UI 用にカードを軽く浮かせる影を追加
        soft: '0 4px 16px -8px rgba(15, 19, 32, 0.12)',
        'dark-soft': '0 4px 16px -6px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
