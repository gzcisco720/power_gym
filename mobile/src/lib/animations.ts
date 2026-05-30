export const springs = {
  default: { stiffness: 300, damping: 30 },
  bouncy: { stiffness: 400, damping: 18 },
  snappy: { stiffness: 600, damping: 35 },
} as const;

export const timings = {
  fade: { duration: 200 },
} as const;
