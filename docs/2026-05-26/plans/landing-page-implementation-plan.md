# Power Gym Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Gatsby 5 landing page at `/landing/` inside the power_gym repo — glassmorphism dark style, AUD pricing, targeting Australian gym owners, English primary with Chinese subtitles.

**Architecture:** Single `index.tsx` page composed of 9 focused components. No backend — pure static export. Screenshots copied from `/context/images/sample_app/` into `landing/static/screenshots/` with clean filenames.

**Tech Stack:** Gatsby 5 · React 18 · TypeScript · Tailwind CSS v3 · Framer Motion · PostCSS

> **Note on testing:** This is a static marketing page with no business logic. TDD's unit-test cycle doesn't apply. Quality gates are: (1) TypeScript compilation clean, (2) `npm run build` succeeds, (3) visual inspection at `npm run develop`. Each task ends with a build/dev check.

---

## File Map

| File | Responsibility |
|---|---|
| `landing/package.json` | Standalone project — Gatsby, Tailwind, Framer Motion deps |
| `landing/gatsby-config.ts` | Gatsby plugins: postcss, Google Fonts via gatsby-plugin-google-gtag is NOT needed — fonts via CSS import |
| `landing/tsconfig.json` | TypeScript config for Gatsby |
| `landing/tailwind.config.js` | Custom colors, font, hero gradient, glassmorphism utilities |
| `landing/postcss.config.js` | Tailwind + autoprefixer |
| `landing/src/styles/global.css` | Tailwind directives + CSS custom properties |
| `landing/src/pages/index.tsx` | Single page — imports and orders all sections |
| `landing/src/components/Navbar.tsx` | Fixed top bar, scroll blur, links + CTAs |
| `landing/src/components/Hero.tsx` | Full-viewport hero: gradient bg, headline, CTAs, badge pills, screenshot frame |
| `landing/src/components/FeaturesGrid.tsx` | 3×2 glassmorphism feature cards |
| `landing/src/components/HowItWorks.tsx` | 3-step owner→trainer→member flow |
| `landing/src/components/ProductShowcase.tsx` | 4 alternating text+screenshot rows |
| `landing/src/components/Pricing.tsx` | 3 AUD pricing cards |
| `landing/src/components/Testimonials.tsx` | 3 glassmorphism quote cards |
| `landing/src/components/CtaBanner.tsx` | Full-width indigo gradient CTA |
| `landing/src/components/Footer.tsx` | Logo, links, copyright, Chinese tagline |
| `landing/static/screenshots/` | Copied + renamed screenshots from context/images/sample_app/ |

---

## Task 1: Scaffold the Gatsby project

**Files:**
- Create: `landing/package.json`
- Create: `landing/gatsby-config.ts`
- Create: `landing/tsconfig.json`

- [ ] **Step 1: Create the landing directory and package.json**

```bash
mkdir /Users/eric_gong/Projects/power_gym/landing
```

Create `landing/package.json`:
```json
{
  "name": "power-gym-landing",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "develop": "gatsby develop",
    "build": "gatsby build",
    "serve": "gatsby serve",
    "clean": "gatsby clean"
  },
  "dependencies": {
    "framer-motion": "^11.3.0",
    "gatsby": "^5.13.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "gatsby-plugin-postcss": "^6.13.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create gatsby-config.ts**

Create `landing/gatsby-config.ts`:
```typescript
import type { GatsbyConfig } from 'gatsby'

const config: GatsbyConfig = {
  siteMetadata: {
    title: 'Power Gym — Professional Gym Management Platform',
    description:
      'The all-in-one gym management platform for Australian gym owners. Training plans, nutrition tracking, analytics, and team management.',
    siteUrl: 'https://powergym.app',
  },
  plugins: ['gatsby-plugin-postcss'],
}

export default config
```

- [ ] **Step 3: Create tsconfig.json**

Create `landing/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "gatsby-config.ts"]
}
```

- [ ] **Step 4: Install dependencies**

```bash
cd /Users/eric_gong/Projects/power_gym/landing && npm install
```

Expected: `node_modules/` created, no errors (warnings about peer deps are OK).

---

## Task 2: Configure Tailwind CSS v3

**Files:**
- Create: `landing/tailwind.config.js`
- Create: `landing/postcss.config.js`
- Create: `landing/src/styles/global.css`

- [ ] **Step 1: Create tailwind.config.js**

Create `landing/tailwind.config.js`:
```js
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
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Create postcss.config.js**

Create `landing/postcss.config.js`:
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: Create src/styles/global.css**

```bash
mkdir -p /Users/eric_gong/Projects/power_gym/landing/src/styles
```

Create `landing/src/styles/global.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }

  body {
    background-color: #0a0a14;
    color: #ffffff;
    font-family: 'Space Grotesk', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  * {
    box-sizing: border-box;
  }
}

@layer utilities {
  .glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .glass-hover {
    transition: background 0.2s, border-color 0.2s;
  }

  .glass-hover:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .text-gradient {
    background: linear-gradient(90deg, #818cf8, #c084fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .glow-indigo {
    box-shadow: 0 0 40px rgba(99, 102, 241, 0.4);
  }

  .glow-indigo-sm {
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
  }
}
```

- [ ] **Step 4: Create src/pages directory and smoke-test page**

```bash
mkdir -p /Users/eric_gong/Projects/power_gym/landing/src/pages
mkdir -p /Users/eric_gong/Projects/power_gym/landing/src/components
```

Create `landing/src/pages/index.tsx` (temporary, will be replaced in Task 13):
```tsx
import React from 'react'
import '../styles/global.css'

export default function IndexPage() {
  return (
    <main className="min-h-screen bg-hero-gradient flex items-center justify-center">
      <h1 className="text-white text-4xl font-extrabold text-gradient">Power Gym</h1>
    </main>
  )
}

export function Head() {
  return <title>Power Gym — Professional Gym Management Platform</title>
}
```

- [ ] **Step 5: Start dev server and verify Tailwind is working**

```bash
cd /Users/eric_gong/Projects/power_gym/landing && npm run develop
```

Open http://localhost:8000 — should see "Power Gym" in an indigo-to-purple gradient on a dark background. Stop the server with Ctrl+C once verified.

---

## Task 3: Copy and rename screenshots

**Files:**
- Create: `landing/static/screenshots/` (directory + files)

- [ ] **Step 1: Create the screenshots directory**

```bash
mkdir -p /Users/eric_gong/Projects/power_gym/landing/static/screenshots
```

- [ ] **Step 2: Copy screenshots with clean names**

```bash
# Training screenshots
cp "/Users/eric_gong/Projects/power_gym/context/images/sample_app/exercise-app-example/IMG_6375.PNG" \
   /Users/eric_gong/Projects/power_gym/landing/static/screenshots/training-1.png

cp "/Users/eric_gong/Projects/power_gym/context/images/sample_app/exercise-app-example/IMG_6377.PNG" \
   /Users/eric_gong/Projects/power_gym/landing/static/screenshots/training-2.png

# Nutrition screenshots
cp "/Users/eric_gong/Projects/power_gym/context/images/sample_app/nutrition-app-example/IMG_6400.PNG" \
   /Users/eric_gong/Projects/power_gym/landing/static/screenshots/nutrition-1.png

cp "/Users/eric_gong/Projects/power_gym/context/images/sample_app/nutrition-app-example/IMG_6401.PNG" \
   /Users/eric_gong/Projects/power_gym/landing/static/screenshots/nutrition-2.png

# Analytics / PBs screenshots
cp "/Users/eric_gong/Projects/power_gym/context/images/sample_app/pbs-app-example/Image_20251004105743_25_17.jpg" \
   /Users/eric_gong/Projects/power_gym/landing/static/screenshots/analytics-1.jpg

cp "/Users/eric_gong/Projects/power_gym/context/images/sample_app/pbs-app-example/Image_20251004105745_26_17.jpg" \
   /Users/eric_gong/Projects/power_gym/landing/static/screenshots/analytics-2.jpg

# Check-in / member management screenshots
cp "/Users/eric_gong/Projects/power_gym/context/images/sample_app/check-in-app-example/IMG_6364.PNG" \
   /Users/eric_gong/Projects/power_gym/landing/static/screenshots/members-1.png

cp "/Users/eric_gong/Projects/power_gym/context/images/sample_app/check-in-app-example/IMG_6366.PNG" \
   /Users/eric_gong/Projects/power_gym/landing/static/screenshots/members-2.png

# Body test screenshot for hero
cp "/Users/eric_gong/Projects/power_gym/context/images/sample_app/exercise-app-example/IMG_6382.PNG" \
   /Users/eric_gong/Projects/power_gym/landing/static/screenshots/hero-dashboard.png
```

- [ ] **Step 3: Verify files exist**

```bash
ls /Users/eric_gong/Projects/power_gym/landing/static/screenshots/
```

Expected: 9 files listed.

---

## Task 4: Build Navbar component

**Files:**
- Create: `landing/src/components/Navbar.tsx`

- [ ] **Step 1: Create Navbar.tsx**

Create `landing/src/components/Navbar.tsx`:
```tsx
import React, { useEffect, useState } from 'react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/60 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm select-none">
            P
          </div>
          <span className="text-white font-bold tracking-wider text-sm uppercase">
            Power Gym
          </span>
        </div>

        {/* Links */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-white/65 hover:text-white text-sm transition-colors duration-200"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-white/65 hover:text-white text-sm transition-colors duration-200"
          >
            Pricing
          </a>
          <a
            href="#"
            className="text-white/65 hover:text-white text-sm transition-colors duration-200"
          >
            Sign In
          </a>
          <a
            href="#"
            className="bg-indigo-gradient text-white text-sm font-semibold px-5 py-2 rounded-full glow-indigo-sm hover:opacity-90 transition-opacity"
          >
            Get Started
          </a>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-white/65 hover:text-white p-2" aria-label="Open menu">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Add Navbar to index.tsx and verify**

Update `landing/src/pages/index.tsx`:
```tsx
import React from 'react'
import '../styles/global.css'
import Navbar from '../components/Navbar'

export default function IndexPage() {
  return (
    <main className="min-h-screen bg-hero-gradient">
      <Navbar />
      <div className="flex items-center justify-center h-screen">
        <h1 className="text-white text-4xl font-extrabold text-gradient">Power Gym</h1>
      </div>
    </main>
  )
}

export function Head() {
  return <title>Power Gym — Professional Gym Management Platform</title>
}
```

Run `npm run develop` from `landing/`. Open http://localhost:8000 — should see the fixed navbar. Scroll down to verify blur appears. Stop server.

---

## Task 5: Build Hero section

**Files:**
- Create: `landing/src/components/Hero.tsx`

- [ ] **Step 1: Create Hero.tsx**

Create `landing/src/components/Hero.tsx`:
```tsx
import { motion } from 'framer-motion'
import React from 'react'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-hero-gradient pt-16">
      {/* Radial glow behind headline */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[700px] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {/* Overline */}
          <p className="text-indigo-400 text-xs uppercase tracking-[0.35em] font-semibold mb-6">
            Gym Management Platform
          </p>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.1] mb-4">
            Run Your Gym
            <br />
            <span className="text-gradient">Like a Pro</span>
          </h1>

          {/* Chinese subtitle */}
          <p className="text-white/40 text-sm mb-8 tracking-wide">
            专业健身房管理，一站式解决方案
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a
              href="#"
              className="inline-flex items-center justify-center bg-indigo-gradient text-white font-semibold px-8 py-3.5 rounded-full glow-indigo hover:opacity-90 transition-opacity text-sm"
            >
              Get Started Free
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center text-white/80 hover:text-white font-semibold px-8 py-3.5 rounded-full border border-white/20 hover:border-white/40 transition-colors text-sm"
            >
              Explore Features →
            </a>
          </div>

          {/* Badge pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-16">
            {[
              '✦ Training Plans',
              '✦ Nutrition Tracking',
              '✦ Analytics & PBs',
            ].map((badge) => (
              <span
                key={badge}
                className="glass text-white/65 text-xs px-4 py-1.5 rounded-full"
              >
                {badge}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Dashboard screenshot in browser frame */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
          className="relative"
        >
          <div className="rounded-t-2xl overflow-hidden border border-white/10 shadow-2xl shadow-indigo-500/20 max-w-4xl mx-auto">
            {/* macOS browser chrome */}
            <div className="bg-[#0d0d1a] px-4 py-3 flex items-center gap-2 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 bg-white/5 rounded-md h-6 mx-4 flex items-center justify-center">
                <span className="text-white/25 text-xs">powergym.app</span>
              </div>
            </div>
            <img
              src="/screenshots/hero-dashboard.png"
              alt="Power Gym dashboard showing training plan"
              className="w-full object-cover object-top max-h-72"
            />
          </div>
          {/* Fade to background */}
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#0a0a14] to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add Hero to index.tsx and verify**

Update `landing/src/pages/index.tsx`:
```tsx
import React from 'react'
import '../styles/global.css'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'

export default function IndexPage() {
  return (
    <main className="bg-[#0a0a14]">
      <Navbar />
      <Hero />
    </main>
  )
}

export function Head() {
  return <title>Power Gym — Professional Gym Management Platform</title>
}
```

Run `npm run develop`. Check http://localhost:8000 — should see full-viewport hero with gradient, headline, CTAs, badge pills, and screenshot frame. Stop server.

---

## Task 6: Build Features Grid

**Files:**
- Create: `landing/src/components/FeaturesGrid.tsx`

- [ ] **Step 1: Create FeaturesGrid.tsx**

Create `landing/src/components/FeaturesGrid.tsx`:
```tsx
import { motion } from 'framer-motion'
import React from 'react'

const FEATURES = [
  {
    icon: '🏋️',
    title: 'Training Plans',
    description:
      'Build and assign multi-day workout programs. Track sets, reps, and weights for every member.',
  },
  {
    icon: '🥗',
    title: 'Nutrition Management',
    description:
      'Set macro targets, manage a food database, and monitor daily intake for each member.',
  },
  {
    icon: '📊',
    title: 'Performance Analytics',
    description:
      '1RM trend charts, 365-day training heatmaps, and personal best tracking for every exercise.',
  },
  {
    icon: '🧪',
    title: 'Body Composition',
    description:
      'Jackson-Pollock skinfold testing with automatic body fat % calculation using the Siri formula.',
  },
  {
    icon: '👥',
    title: 'Team Management',
    description:
      'Invite trainers, assign members, and manage role-based access — Owner, Trainer, and Member.',
  },
  {
    icon: '📅',
    title: 'Scheduling & Check-ins',
    description:
      'Calendar session booking, recurring appointments, daily check-in tracking, and email reminders.',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
}

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-indigo-400 text-xs uppercase tracking-[0.35em] font-semibold mb-4">
            Everything Your Gym Needs
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            One platform. Every tool.
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            From workout programs to nutrition plans to body composition testing — built for serious gym businesses.
          </p>
          <p className="text-white/25 text-sm mt-2">为专业健身房打造的完整管理工具</p>
        </motion.div>

        {/* 3×2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={cardVariants}
              className="glass glass-hover rounded-2xl p-6"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-2xl mb-4">
                {feature.icon}
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{feature.title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

## Task 7: Build How It Works section

**Files:**
- Create: `landing/src/components/HowItWorks.tsx`

- [ ] **Step 1: Create HowItWorks.tsx**

Create `landing/src/components/HowItWorks.tsx`:
```tsx
import { motion } from 'framer-motion'
import React from 'react'

const STEPS = [
  {
    number: '01',
    role: 'Gym Owner',
    title: 'Set up your gym',
    description:
      'Create your account, upload your branding, and invite your training team. You\'re in control.',
    color: 'from-indigo-500 to-indigo-600',
    glow: 'rgba(99,102,241,0.3)',
  },
  {
    number: '02',
    role: 'Trainers',
    title: 'Manage your members',
    description:
      'Build personalised training and nutrition plans, track progress, and run daily check-ins.',
    color: 'from-purple-500 to-purple-600',
    glow: 'rgba(139,92,246,0.3)',
  },
  {
    number: '03',
    role: 'Members',
    title: 'See real results',
    description:
      'Log workouts, view nutrition targets, track body composition, and watch progress charts grow.',
    color: 'from-indigo-400 to-purple-500',
    glow: 'rgba(129,140,248,0.3)',
  },
]

export default function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-indigo-400 text-xs uppercase tracking-[0.35em] font-semibold mb-4">
            How It Works
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Built for the whole team
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Power Gym connects owners, trainers, and members in one seamless platform.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-indigo-400/30" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="text-center"
            >
              {/* Step number circle */}
              <div className="relative inline-flex mb-6">
                <div
                  className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center`}
                  style={{ boxShadow: `0 0 32px ${step.glow}` }}
                >
                  <span className="text-white font-extrabold text-xl">{step.number}</span>
                </div>
              </div>
              <p className={`text-xs uppercase tracking-[0.25em] font-semibold mb-2 bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}>
                {step.role}
              </p>
              <h3 className="text-white font-bold text-lg mb-3">{step.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

## Task 8: Build Product Showcase

**Files:**
- Create: `landing/src/components/ProductShowcase.tsx`

- [ ] **Step 1: Create ProductShowcase.tsx**

Create `landing/src/components/ProductShowcase.tsx`:
```tsx
import { motion } from 'framer-motion'
import React from 'react'

interface ShowcaseItem {
  tag: string
  title: string
  description: string
  bullets: string[]
  imageSrc: string
  imageAlt: string
  textLeft: boolean
}

const ITEMS: ShowcaseItem[] = [
  {
    tag: 'Training Plans',
    title: 'Build powerful workout programs',
    description:
      'Create multi-day training templates with exercises, sets, and rep ranges. Assign plans to members instantly — they see it the moment they log in.',
    bullets: [
      'Drag-and-drop exercise builder',
      'Custom set/rep/weight targets',
      'Assign to individuals or groups',
    ],
    imageSrc: '/screenshots/training-1.png',
    imageAlt: 'Training plan builder interface',
    textLeft: true,
  },
  {
    tag: 'Nutrition Management',
    title: 'Precision nutrition for every member',
    description:
      'Build nutrition templates with macro targets for training, rest, and high-carb days. Members log meals against their plan daily.',
    bullets: [
      'Per-100g food database',
      'Training/rest/high-carb day templates',
      'Macro breakdown with visual charts',
    ],
    imageSrc: '/screenshots/nutrition-1.png',
    imageAlt: 'Nutrition dashboard showing macro breakdown',
    textLeft: false,
  },
  {
    tag: 'Performance Analytics',
    title: 'Track progress that motivates',
    description:
      'Epley-estimated 1RM trend lines, 365-day training heatmaps, and per-exercise personal bests. Give members the data to stay motivated.',
    bullets: [
      '1RM trend charts with dual Y-axis',
      '365-day training activity heatmap',
      'Personal best history per exercise',
    ],
    imageSrc: '/screenshots/analytics-1.jpg',
    imageAlt: 'Performance analytics charts and heatmap',
    textLeft: true,
  },
  {
    tag: 'Member Management',
    title: 'Run your team from one dashboard',
    description:
      'Invite trainers and members via secure email links. Daily check-ins, injury tracking, and health dashboards keep you informed on every member.',
    bullets: [
      'Trainer → member assignment hierarchy',
      'Daily check-in tracking',
      'Injury records and health dashboard',
    ],
    imageSrc: '/screenshots/members-1.png',
    imageAlt: 'Member management and check-in interface',
    textLeft: false,
  },
]

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
      <div className="bg-[#0d0d1a] px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 bg-white/5 rounded h-5 mx-3" />
      </div>
      <img src={src} alt={alt} className="w-full object-cover object-top" />
    </div>
  )
}

export default function ProductShowcase() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto space-y-28">
        {ITEMS.map((item, i) => (
          <motion.div
            key={item.tag}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
              item.textLeft ? '' : 'lg:[&>*:first-child]:order-2'
            }`}
          >
            {/* Text */}
            <div>
              <p className="text-indigo-400 text-xs uppercase tracking-[0.3em] font-semibold mb-4">
                {item.tag}
              </p>
              <h3 className="text-white font-extrabold text-2xl md:text-3xl mb-4 leading-tight">
                {item.title}
              </h3>
              <p className="text-white/55 text-base leading-relaxed mb-6">
                {item.description}
              </p>
              <ul className="space-y-2.5">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm text-white/65">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            {/* Screenshot */}
            <BrowserFrame src={item.imageSrc} alt={item.imageAlt} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
```

---

## Task 9: Build Pricing section

**Files:**
- Create: `landing/src/components/Pricing.tsx`

- [ ] **Step 1: Create Pricing.tsx**

Create `landing/src/components/Pricing.tsx`:
```tsx
import { motion } from 'framer-motion'
import React from 'react'

interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  highlighted: boolean
}

const TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: 'A$49',
    period: '/month',
    description: 'Perfect for small gyms getting started.',
    features: [
      '1 trainer account',
      'Up to 30 members',
      'Training & nutrition plans',
      'Body composition testing',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 'A$99',
    period: '/month',
    description: 'For growing gyms that need more power.',
    features: [
      'Up to 5 trainers',
      'Up to 150 members',
      'Everything in Starter',
      'Performance analytics & PBs',
      'Scheduling & check-ins',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For large gyms and multi-location operators.',
    features: [
      'Unlimited trainers',
      'Unlimited members',
      'Everything in Pro',
      'White-label branding',
      'Dedicated account manager',
      'SLA & onboarding support',
    ],
    cta: 'Contact Us',
    highlighted: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-indigo-400 text-xs uppercase tracking-[0.35em] font-semibold mb-4">
            Pricing
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            No hidden fees. No lock-in contracts. Cancel anytime.
          </p>
          <p className="text-white/25 text-sm mt-2">所有价格均以澳元计算，含 GST</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 flex flex-col ${
                tier.highlighted
                  ? 'bg-gradient-to-b from-indigo-500/20 to-purple-500/10 border-2 border-indigo-500/50 glow-indigo'
                  : 'glass'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-gradient text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white font-bold text-lg mb-1">{tier.name}</h3>
                <p className="text-white/50 text-sm mb-4">{tier.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-white font-extrabold text-4xl">{tier.price}</span>
                  <span className="text-white/40 text-sm">{tier.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-white/65">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
                      <circle cx="8" cy="8" r="7" stroke="#6366f1" strokeWidth="1.5" />
                      <path d="M5 8l2 2 4-4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`w-full text-center font-semibold py-3 rounded-xl text-sm transition-opacity ${
                  tier.highlighted
                    ? 'bg-indigo-gradient text-white glow-indigo-sm hover:opacity-90'
                    : 'bg-white/10 text-white hover:bg-white/15 border border-white/15'
                }`}
              >
                {tier.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

## Task 10: Build Testimonials section

**Files:**
- Create: `landing/src/components/Testimonials.tsx`

- [ ] **Step 1: Create Testimonials.tsx**

Create `landing/src/components/Testimonials.tsx`:
```tsx
import { motion } from 'framer-motion'
import React from 'react'

const TESTIMONIALS = [
  {
    quote:
      "Power Gym replaced three separate tools we were using. Our trainers adopted it within a week — the member tracking alone saved us hours every month.",
    name: 'Sarah Mitchell',
    role: 'Owner',
    gym: 'Elevate Fitness, Melbourne',
    initials: 'SM',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    quote:
      "The nutrition template system is exactly what I needed. I build a plan once and my clients get everything — macros, meal timing, daily logs. It\'s seamless.",
    name: 'James Kowalski',
    role: 'Head Trainer',
    gym: 'Peak Performance, Sydney',
    initials: 'JK',
    color: 'from-purple-500 to-purple-600',
  },
  {
    quote:
      "Seeing my 1RM progress on a chart actually keeps me accountable. My trainer and I review it every month — it\'s become a huge part of how I train.",
    name: 'Lena Tran',
    role: 'Member',
    gym: 'Fortitude CrossFit, Brisbane',
    initials: 'LT',
    color: 'from-indigo-400 to-purple-500',
  },
]

export default function Testimonials() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-indigo-400 text-xs uppercase tracking-[0.35em] font-semibold mb-4">
            Testimonials
          </p>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Loved by gym teams across Australia
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass glass-hover rounded-2xl p-7 flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg key={j} width="14" height="14" viewBox="0 0 14 14" fill="#6366f1">
                    <path d="M7 1l1.55 3.14L12 4.72l-2.5 2.43.59 3.44L7 9l-3.09 1.62.59-3.44L2 4.72l3.45-.58L7 1z" />
                  </svg>
                ))}
              </div>

              <p className="text-white/70 text-sm leading-relaxed flex-1 mb-6">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/45 text-xs">
                    {t.role} · {t.gym}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

---

## Task 11: Build CTA Banner and Footer

**Files:**
- Create: `landing/src/components/CtaBanner.tsx`
- Create: `landing/src/components/Footer.tsx`

- [ ] **Step 1: Create CtaBanner.tsx**

Create `landing/src/components/CtaBanner.tsx`:
```tsx
import { motion } from 'framer-motion'
import React from 'react'

export default function CtaBanner() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl bg-indigo-gradient p-px"
        >
          <div className="rounded-3xl bg-gradient-to-br from-indigo-500/20 via-[#0f0f1a] to-purple-500/10 px-10 py-16 text-center"
            style={{ boxShadow: '0 0 80px rgba(99,102,241,0.25)' }}
          >
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              Ready to transform your gym?
            </h2>
            <p className="text-white/55 text-base mb-8 max-w-lg mx-auto">
              Join gym owners across Australia using Power Gym to grow their business and retain more members.
            </p>
            <a
              href="#"
              className="inline-flex items-center justify-center bg-white text-indigo-600 font-bold px-10 py-4 rounded-full hover:bg-white/90 transition-colors text-sm"
            >
              Get Started Free
            </a>
            <p className="text-white/30 text-xs mt-4">No credit card required · Cancel anytime</p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create Footer.tsx**

Create `landing/src/components/Footer.tsx`:
```tsx
import React from 'react'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                P
              </div>
              <span className="text-white font-bold tracking-wider text-sm uppercase">
                Power Gym
              </span>
            </div>
            <p className="text-white/35 text-xs">专业健身房管理平台</p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            {[
              { label: 'Features', href: '#features' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Sign In', href: '#' },
              { label: 'Privacy', href: '#' },
              { label: 'Terms', href: '#' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-white/40 hover:text-white/70 text-sm transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-white/30 text-xs text-center md:text-right">
            © 2026 Power Gym. All rights reserved.
            <br />
            ABN 00 000 000 000
          </p>
        </div>
      </div>
    </footer>
  )
}
```

---

## Task 12: Assemble the full page

**Files:**
- Modify: `landing/src/pages/index.tsx`

- [ ] **Step 1: Replace index.tsx with all sections wired together**

Replace `landing/src/pages/index.tsx` with:
```tsx
import React from 'react'
import '../styles/global.css'
import CtaBanner from '../components/CtaBanner'
import FeaturesGrid from '../components/FeaturesGrid'
import Footer from '../components/Footer'
import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Navbar from '../components/Navbar'
import Pricing from '../components/Pricing'
import ProductShowcase from '../components/ProductShowcase'
import Testimonials from '../components/Testimonials'

export default function IndexPage() {
  return (
    <main className="bg-[#0a0a14] overflow-x-hidden">
      <Navbar />
      <Hero />
      <FeaturesGrid />
      <HowItWorks />
      <ProductShowcase />
      <Pricing />
      <Testimonials />
      <CtaBanner />
      <Footer />
    </main>
  )
}

export function Head() {
  return (
    <>
      <title>Power Gym — Professional Gym Management Platform</title>
      <meta
        name="description"
        content="The all-in-one gym management platform for Australian gym owners. Training plans, nutrition tracking, analytics, and team management."
      />
      <meta property="og:title" content="Power Gym — Professional Gym Management Platform" />
      <meta
        property="og:description"
        content="Training plans, nutrition tracking, body composition testing, and performance analytics. Built for serious Australian gym businesses."
      />
      <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%236366f1'/><text y='.9em' font-size='80' x='10'>P</text></svg>" />
    </>
  )
}
```

- [ ] **Step 2: Run the dev server and visually inspect all sections**

```bash
cd /Users/eric_gong/Projects/power_gym/landing && npm run develop
```

Open http://localhost:8000 and scroll through the full page. Check:
- [ ] Navbar fixed and blur on scroll
- [ ] Hero gradient, headline, CTAs, badge pills, screenshot frame visible
- [ ] Features grid 3×2 cards animate in on scroll
- [ ] How It Works 3 steps horizontal on desktop
- [ ] Product Showcase 4 alternating rows with screenshots
- [ ] Pricing 3 cards, middle one highlighted with "Most Popular"
- [ ] Testimonials 3 quote cards
- [ ] CTA Banner gradient border effect
- [ ] Footer with links and Chinese tagline

Stop the server once satisfied.

---

## Task 13: Production build verification

- [ ] **Step 1: Run the production build**

```bash
cd /Users/eric_gong/Projects/power_gym/landing && npm run build
```

Expected: `info Done building in X.XXX sec` with no TypeScript errors and no warnings about missing modules.

- [ ] **Step 2: Verify the built output**

```bash
ls /Users/eric_gong/Projects/power_gym/landing/public/
```

Expected: `index.html`, `page-data/`, `static/` directories present.

- [ ] **Step 3: Serve and do a final check**

```bash
cd /Users/eric_gong/Projects/power_gym/landing && npm run serve
```

Open http://localhost:9000 — confirm the production build renders correctly. Stop the server.

- [ ] **Step 4: Commit**

```bash
cd /Users/eric_gong/Projects/power_gym && git add landing/ docs/2026-05-26/plans/
git commit -m "feat(landing): add Gatsby landing page with glassmorphism design, AUD pricing, and app screenshots"
```
