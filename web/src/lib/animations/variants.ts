import type { Variants } from 'framer-motion';

export const springs = {
  default: { type: 'spring' as const, stiffness: 300, damping: 30 },
  bouncy:  { type: 'spring' as const, stiffness: 400, damping: 18 },
  snappy:  { type: 'spring' as const, stiffness: 600, damping: 35 },
} as const;

export const variants = {
  fadeSlideUp: {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0,  transition: springs.default },
    exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
  } satisfies Variants,

  staggerContainer: {
    hidden:  {},
    visible: { transition: { staggerChildren: 0.06 } },
  } satisfies Variants,

  staggerItem: {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0,  transition: springs.default },
  } satisfies Variants,

  scaleIn: {
    hidden:  { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1,   transition: springs.bouncy },
    exit:    { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
  } satisfies Variants,

  pageEnter:   { opacity: 0,  x: '100%' },
  pageVisible: { opacity: 1,  x: 0,      transition: { type: 'spring' as const, stiffness: 300, damping: 30, duration: 0.35 } },
  pageExit:    { opacity: 0,  x: '-25%', transition: { duration: 0.2, ease: 'easeIn' as const } },
} as const;
