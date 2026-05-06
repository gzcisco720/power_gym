interface MacroValue {
  actual: number;
  target: number;
}

interface MacroRingProps {
  values: {
    kcal: MacroValue;
    protein: MacroValue;
    carbs: MacroValue;
    fat: MacroValue;
  };
  size?: number;
}

const COLORS: Record<string, string> = {
  kcal: '#3b82f6',
  protein: '#10b981',
  carbs: '#f59e0b',
  fat: '#ec4899',
};

const TRACK = '#27272a';
const RINGS: ReadonlyArray<keyof MacroRingProps['values']> = ['kcal', 'protein', 'carbs', 'fat'];

function pct(v: MacroValue): number {
  if (v.target <= 0) return 0;
  return Math.min(100, (v.actual / v.target) * 100);
}

export function MacroRing({ values, size = 120 }: MacroRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 8;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Macro progress"
    >
      {RINGS.map((key, i) => {
        const r = cx - stroke / 2 - i * (stroke + 2);
        const filled = pct(values[key]);
        return (
          <g key={key}>
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
              stroke={COLORS[key]}
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
