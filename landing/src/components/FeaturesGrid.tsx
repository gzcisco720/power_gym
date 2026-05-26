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
            From workout programs to nutrition plans to body composition testing — built for
            serious gym businesses.
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
