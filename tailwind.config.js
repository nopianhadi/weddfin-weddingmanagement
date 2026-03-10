/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        'brand': {
          'bg': 'var(--color-bg)',
          'surface': 'var(--color-surface)',
          'accent': 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          'danger': 'var(--color-danger)',
          'success': 'var(--color-success)',
          'text-light': 'var(--color-text-light)',
          'text-primary': 'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'border': 'var(--color-border)',
          'input': 'var(--color-input-bg)',
        }
      },
      boxShadow: {
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'up-lg': '0 -10px 15px -3px rgb(0 0 0 / 0.05), 0 -4px 6px -4px rgb(0 0 0 / 0.05)',
        'soft': '0 4px 20px -4px rgba(0, 0, 0, 0.1)',
        'neumorphism': '8px 8px 16px #c8d0e7, -8px -8px 16px #ffffff'
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.2s ease-out'
      }
    }
  },
  plugins: [],
}

