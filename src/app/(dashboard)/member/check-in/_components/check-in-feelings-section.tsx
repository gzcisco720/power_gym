interface RatingFields {
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
}

const RATINGS: { key: keyof RatingFields; label: string }[] = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'energy', label: 'Energy' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'digestion', label: 'Digestion' },
];

interface Props {
  ratings: RatingFields;
  onChange: (key: keyof RatingFields, value: number) => void;
}

export function CheckInFeelingsSection({ ratings, onChange }: Props) {
  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-4">
        How are you feeling?
      </h3>
      <div className="space-y-3">
        {RATINGS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="text-[12px] text-foreground/65 w-24 shrink-0">{label}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={ratings[key]}
              onChange={(e) => onChange(key, Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <span className="text-[13px] font-semibold text-primary-light w-5 text-right tabular-nums">
              {ratings[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
