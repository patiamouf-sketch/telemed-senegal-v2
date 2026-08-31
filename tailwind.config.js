/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        '16': '16px',
        '20': '20px',
        '24': '24px',
        '28': '28px',
        '32': '32px',
        'glass': '32px',
        'glass-lg': '36px',
        'glass-sm': '20px',
      },
      colors: {
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6', // Bleu Vif Doux
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        medical: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        pastel: {
          sky: '#E0F2FE',
          rose: '#FCE7F3',
          purple: '#F3E8FF',
          teal: '#CCFBF1',
          emerald: '#D1FAE5',
          amber: '#FEF3C7',
        }
      },
      boxShadow: {
        'soft-float': '0 20px 50px -12px rgba(14, 165, 233, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        'soft-float-hover': '0 28px 60px -15px rgba(14, 165, 233, 0.14), 0 0 0 1px rgba(255, 255, 255, 0.95) inset',
        'glass-card': '0 15px 35px -5px rgba(2, 132, 199, 0.05), 0 0 0 1px rgba(255, 255, 255, 0.7) inset',
        'pill': '0 10px 25px -3px rgba(59, 130, 246, 0.25)',
        'pill-emerald': '0 10px 25px -3px rgba(16, 185, 129, 0.25)',
      },
      backdropBlur: {
        'glass': '20px',
        'glass-heavy': '32px',
      }
    },
  },
  plugins: [],
}
