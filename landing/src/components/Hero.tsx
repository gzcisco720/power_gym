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
            {['✦ Training Plans', '✦ Nutrition Tracking', '✦ Analytics & PBs'].map(
              (badge) => (
                <span
                  key={badge}
                  className="glass text-white/65 text-xs px-4 py-1.5 rounded-full"
                >
                  {badge}
                </span>
              )
            )}
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
