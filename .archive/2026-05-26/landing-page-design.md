# Power Gym Landing Page — Design Spec

**Date:** 2026-05-26  
**Status:** Approved

---

## Overview

A standalone Gatsby 5 marketing landing page for Power Gym, targeting gym owners in Australia. Located at `/landing/` inside the `power_gym` repo — a fully independent Node project with its own `package.json` and `node_modules`, never imported by the main app.

**Primary audience:** Gym owners  
**Language:** English (Australian) primary · Chinese (Simplified) secondary subtitles  
**Region:** Australia (AUD pricing, Australian English)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Gatsby 5 |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + PostCSS |
| Animations | Framer Motion |
| Package manager | npm (standalone from main app's pnpm) |

---

## Visual Direction

**Style:** Glassmorphism / Gradient Hero — matches modern fitness SaaS brands.

| Token | Value |
|---|---|
| Hero background | `linear-gradient(135deg, #0a0a14, #1a1030, #0a1020)` |
| Primary accent | Indigo `#6366f1` / Purple `#8b5cf6` |
| Glass card surface | `rgba(255,255,255,0.05)` + `backdrop-filter: blur(16px)` |
| Glass card border | `1px solid rgba(255,255,255,0.1)` |
| Primary text | `#ffffff` |
| Secondary text | `rgba(255,255,255,0.65)` |
| Typography | Space Grotesk (Google Fonts) |

Animations: Framer Motion `viewport`-triggered `fadeSlideUp` on all sections. Stagger on feature cards.

---

## Page Sections (top → bottom)

### 1. Navbar
Fixed top bar with `backdrop-blur` activated on scroll.
- Left: indigo `P` icon + **POWER GYM** wordmark
- Right: "Features" anchor · "Pricing" anchor · "Sign In" ghost button · "Get Started" indigo pill CTA

### 2. Hero
Full-viewport section. Radial indigo glow behind headline.
- Overline: `GYM MANAGEMENT PLATFORM` (uppercase, indigo, letter-spaced)
- H1: **"Run Your Gym Like a Pro"**
- Chinese sub-tagline: `专业健身房管理，一站式解决方案`
- CTAs: `Get Started Free` (indigo gradient pill) · `Watch Demo` (ghost)
- 3 frosted-glass badge pills: `✦ Training Plans` · `✦ Nutrition Tracking` · `✦ Analytics`
- Browser-frame dashboard screenshot fading in at the bottom, cropped at the fold

### 3. Features Grid
Section label: `EVERYTHING YOUR GYM NEEDS`  
3×2 glassmorphism cards, stagger-animated on scroll:

| Icon | Title | Description |
|---|---|---|
| 🏋️ | Training Plans | Build and assign multi-day workout programs |
| 🥗 | Nutrition Management | Macro targets, food database, daily logs |
| 📊 | Performance Analytics | 1RM trends, training heatmaps, PB tracking |
| 🧪 | Body Composition | Jackson-Pollock skinfold testing & body fat % |
| 👥 | Team Management | Trainers, members, role-based access hierarchy |
| 📅 | Scheduling & Check-ins | Calendar sessions, daily check-ins, email reminders |

### 4. How It Works
3-step horizontal flow with connecting arrows:
1. **Owner sets up** — Create the gym, invite trainers, configure branding
2. **Trainers manage members** — Build plans, track progress, run check-ins
3. **Members see results** — Log workouts, view nutrition, track body composition

### 5. Product Showcase
4 alternating left/right feature+screenshot pairs:

| Row | Text side | Feature | Screenshot source |
|---|---|---|---|
| 1 | Left | Training Plan Builder | `exercise-app-example/` |
| 2 | Right | Nutrition Dashboard | `nutrition-app-example/` |
| 3 | Left | Progress & Analytics | `pbs-app-example/` |
| 4 | Right | Member Management | `check-in-app-example/` |

Screenshots copied from `/context/images/sample_app/` into `landing/static/screenshots/`.

### 6. Pricing
3 glassmorphism pricing cards. Middle card highlighted (indigo glow + "Most Popular" badge):

| Tier | Price | Trainers | Members |
|---|---|---|---|
| Starter | A$49/mo | 1 | Up to 30 |
| Pro *(Most Popular)* | A$99/mo | 5 | Up to 150 |
| Enterprise | Custom | Unlimited | Unlimited |

### 7. Testimonials
3 frosted-glass quote cards in a horizontal row. Avatar circle, name, gym name, quote. Placeholder content.

### 8. CTA Banner
Full-width indigo gradient band:
- Headline: **"Ready to transform your gym?"**
- CTA: `Get Started Free`
- Fine print: `No credit card required`

### 9. Footer
Logo + tagline · Feature/Pricing/Sign In links · © 2026 Power Gym · `专业健身房管理平台`

---

## Project Structure

```
landing/
  gatsby-config.ts
  tsconfig.json
  tailwind.config.js
  postcss.config.js
  package.json
  static/
    screenshots/          # copied from /context/images/sample_app/
  src/
    pages/
      index.tsx           # single page, all sections
    components/
      Navbar.tsx
      Hero.tsx
      FeaturesGrid.tsx
      HowItWorks.tsx
      ProductShowcase.tsx
      Pricing.tsx
      Testimonials.tsx
      CtaBanner.tsx
      Footer.tsx
    styles/
      global.css          # Tailwind directives + custom CSS vars
```

---

## Deployment

Static Gatsby build — deployable to Vercel, Netlify, or GitHub Pages. No server required.
