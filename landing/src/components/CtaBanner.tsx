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
          className="rounded-3xl p-px bg-indigo-gradient"
        >
          <div
            className="rounded-3xl bg-gradient-to-br from-indigo-500/20 via-[#0f0f1a] to-purple-500/10 px-10 py-16 text-center"
            style={{ boxShadow: '0 0 80px rgba(99,102,241,0.25)' }}
          >
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              Ready to transform your gym?
            </h2>
            <p className="text-white/55 text-base mb-8 max-w-lg mx-auto">
              Join gym owners across Australia using Power Gym to grow their business and retain
              more members.
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
