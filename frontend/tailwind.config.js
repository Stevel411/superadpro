/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // SuperAdPro brand
        navy: { DEFAULT: '#1c223d', dark: '#0f1525', light: '#272e4d' },
        cyan: { DEFAULT: '#0ea5e9', light: '#e0f2fe', dark: '#0284c7' },
        // Semantic
        surface: { DEFAULT: '#f8f9fb', '2': '#f1f3f7' },
        // Income stream colours
        emerald: { DEFAULT: '#16a34a', light: '#dcfce7' },
        violet: { DEFAULT: '#6366f1', light: '#ede9fe' },
        amber: { DEFAULT: '#d97706', light: '#fef3c7' },
        rose: { DEFAULT: '#e11d48', light: '#ffe4e6' },
      },
      fontFamily: {
        sans: ['DM Sans', 'Plus Jakarta Sans', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.16), 0 8px 24px rgba(0,0,0,0.12)',
        'card-hover': '0 6px 20px rgba(0,0,0,0.22), 0 12px 40px rgba(0,0,0,0.16)',
        'topbar': '0 1px 0 rgba(0,200,255,0.15), 0 4px 20px rgba(0,0,0,0.3)',
      }
    },
  },
  plugins: [],
}
