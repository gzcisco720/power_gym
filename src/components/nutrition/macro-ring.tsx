interface MacroRingProps {
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  size?: number; // default 120
}

const COLORS = { protein: '#10b981', carbs: '#f59e0b', fat: '#ec4899' } as const;
const TRACK = '#27272a';
const RINGS = ['protein', 'carbs', 'fat'] as const;
type Ring = (typeof RINGS)[number];

const KCAL_PER_G: Record<Ring, number> = { protein: 4, carbs: 4, fat: 9 };

export function MacroRing({ protein, carbs, fat, size = 120 }: MacroRingProps) {
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
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={COLORS[ring]}
              strokeWidth={stroke}
              pathLength={100}
              strokeDasharray={`${filled} ${100 - filled}`}
              strokeDashoffset={25}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}
