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
        popover: '#0d0d0d',
        'popover-foreground': '#ffffff',
        primary: '#4f46e5',
        'primary-foreground': '#ffffff',
        'primary-light': '#818cf8',
        secondary: '#161616',
        'secondary-foreground': '#ffffff',
        muted: '#161616',
        'muted-foreground': '#888888',
        accent: '#1f1f1f',
        'accent-foreground': '#ffffff',
        destructive: '#ef4444',
        'destructive-foreground': '#ffffff',
        input: '#1f1f1f',
        border: '#161616',
        ring: '#ffffff',
      },
    },
  },
  plugins: [],
};
