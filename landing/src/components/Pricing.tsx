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
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="flex-shrink-0 mt-0.5"
                    >
                      <circle cx="8" cy="8" r="7" stroke="#6366f1" strokeWidth="1.5" />
                      <path
                        d="M5 8l2 2 4-4"
                        stroke="#6366f1"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
