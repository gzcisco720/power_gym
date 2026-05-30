/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        foreground: '#ffffff',
        card: '#111111',
        primary: '#4f46e5',
        'primary-light': '#818cf8',
        muted: '#161616',
        destructive: '#ef4444',
        input: '#1f1f1f',
        border: '#161616',
      },
    },
  },
  plugins: [],
};
