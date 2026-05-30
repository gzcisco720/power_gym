import { m, useReducedMotion } from 'framer-motion';

interface MacroRingProps {
  protein: number;
  carbs: number;
  fat: number;
  size?: number;
}

const COLORS = { protein: '#10b981', carbs: '#f59e0b', fat: '#ec4899' } as const;
const TRACK = '#27272a';
const RINGS = ['protein', 'carbs', 'fat'] as const;
type Ring = (typeof RINGS)[number];

const KCAL_PER_G: Record<Ring, number> = { protein: 4, carbs: 4, fat: 9 };
const OFFSET_REST = 25;

export function MacroRing({ protein, carbs, fat, size = 120 }: MacroRingProps) {
  const shouldReduce = useReducedMotion();
  const grams: Record<Ring, number> = { protein, carbs, fat };
  const totalKcal = protein * 4 + carbs * 4 + fat * 9;

  const cx = size / 2;
  const cy = size / 2;
  const stroke = 8;

  function pct(ring: Ring): number {
    if (totalKcal <= 0) return 0;
    return (grams[ring] * KCAL_PER_G[ring] / totalKcal) * 100;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Macro distribution"
    >
      {RINGS.map((ring, i) => {
        const r = cx - stroke / 2 - i * (stroke + 2);
        const filled = pct(ring);
        const hiddenOffset = filled + OFFSET_REST;
        const visibleOffset = OFFSET_REST;
        return (
          <g key={ring}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={TRACK}
              strokeWidth={stroke}
              pathLength={100}
            />
            <m.circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={COLORS[ring]}
              strokeWidth={stroke}
              pathLength={100}
              strokeDasharray={`${filled} ${100 - filled}`}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
              initial={{ strokeDashoffset: shouldReduce ? visibleOffset : hiddenOffset }}
              animate={{ strokeDashoffset: visibleOffset }}
              transition={
                shouldReduce
                  ? { duration: 0 }
                  : { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }
              }
            />
          </g>
        );
      })}
    </svg>
  );
}
