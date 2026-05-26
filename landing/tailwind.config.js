/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        indigo: {
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        purple: {
          400: '#c084fc',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      backgroundImage: {
        'hero-gradient':
          'linear-gradient(135deg, #0a0a14 0%, #1a1030 50%, #0a1020 100%)',
        'indigo-gradient':
          'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      },
    },
  },
  plugins: [],
}
