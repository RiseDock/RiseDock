/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
        },
        success: {
          DEFAULT: '#10B981',
          hover: '#059669',
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
        },
        surface: '#FFFFFF',
        background: '#F8FAFC',
        border: '#E2E8F0',
        text: {
          DEFAULT: '#1E293B',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
      },
    },
  },
  plugins: [],
};
