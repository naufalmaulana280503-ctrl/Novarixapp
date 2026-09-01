/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        novarix: {
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
        }
      },
      backgroundImage: {
        'nova-gradient': 'linear-gradient(90deg, #0ea5e9 0%, #06b6d4 35%, #10b981 65%, #34d399 100%)',
        'nova-gradient-br': 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 35%, #10b981 65%, #34d399 100%)',
        'nova-gradient-bl': 'linear-gradient(45deg, #0ea5e9 0%, #06b6d4 35%, #10b981 65%, #34d399 100%)',
        'nova-gradient-tb': 'linear-gradient(180deg, #0ea5e9 0%, #06b6d4 35%, #10b981 65%, #34d399 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'gradient-x': 'gradientX 5s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientX: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      }
    },
  },
  plugins: [],
}
