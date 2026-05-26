import { motion } from 'framer-motion'
import React from 'react'

const TESTIMONIALS = [
  {
    quote:
      'Power Gym replaced three separate tools we were using. Our trainers adopted it within a week — the member tracking alone saved us hours every month.',
    name: 'Sarah Mitchell',
    role: 'Owner',
    gym: 'Elevate Fitness, Melbourne',
    initials: 'SM',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    quote:
      "The nutrition template system is exactly what I needed. I build a plan once and my clients get everything — macros, meal timing, daily logs. It's seamless.",
    name: 'James Kowalski',
    role: 'Head Trainer',
    gym: 'Peak Performance, Sydney',
    initials: 'JK',
    color: 'from-purple-500 to-purple-600',
  },
  {
    quote:
      "Seeing my 1RM progress on a chart actually keeps me accountable. My trainer and I review it every month — it's become a huge part of how I train.",
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

              <p className="text-white/70 text-sm leading-relaxed flex-1 mb-6">"{t.quote}"</p>

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
