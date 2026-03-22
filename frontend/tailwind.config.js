/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        steel: {
          900: '#050e1a',
          800: '#0a1929',
          700: '#0B3C5D',
          600: '#0d4a75',
          500: '#1565a0',
          400: '#1e7bc4',
          300: '#4da6d9',
          200: '#7ec8e3',
          100: '#b8e0f2',
        },
        orange: {
          600: '#cc5500',
          500: '#FF7A00',
          400: '#ff9433',
          300: '#ffb066',
          200: '#ffcb99',
        },
        risk: {
          critical: '#ff2d55',
          high: '#ff6b35',
          medium: '#ffcc02',
          low: '#34c759',
        }
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.4s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #FF7A00, 0 0 10px #FF7A00' },
          '100%': { boxShadow: '0 0 20px #FF7A00, 0 0 40px #FF7A00, 0 0 60px #FF7A00' },
        }
      }
    },
  },
  plugins: [],
}
