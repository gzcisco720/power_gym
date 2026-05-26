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
        {ITEMS.map((item) => (
          <motion.div
            key={item.tag}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
              !item.textLeft ? 'lg:grid-flow-dense' : ''
            }`}
          >
            {/* Text */}
            <div className={!item.textLeft ? 'lg:col-start-2' : ''}>
              <p className="text-indigo-400 text-xs uppercase tracking-[0.3em] font-semibold mb-4">
                {item.tag}
              </p>
              <h3 className="text-white font-extrabold text-2xl md:text-3xl mb-4 leading-tight">
                {item.title}
              </h3>
              <p className="text-white/55 text-base leading-relaxed mb-6">{item.description}</p>
              <ul className="space-y-2.5">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-sm text-white/65">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="#818cf8"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            {/* Screenshot */}
            <div className={!item.textLeft ? 'lg:col-start-1 lg:row-start-1' : ''}>
              <BrowserFrame src={item.imageSrc} alt={item.imageAlt} />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
