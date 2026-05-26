import { motion } from 'framer-motion'
import React from 'react'

const STEPS = [
  {
    number: '01',
    role: 'Gym Owner',
    title: 'Set up your gym',
    description:
      "Create your account, upload your branding, and invite your training team. You're in control.",
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
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
              <p
                className={`text-xs uppercase tracking-[0.25em] font-semibold mb-2 bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}
              >
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
