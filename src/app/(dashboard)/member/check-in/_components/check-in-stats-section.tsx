interface StatValues {
  weight: string;
  waist: string;
  steps: string;
  exerciseMinutes: string;
  walkRunDistance: string;
  sleepHours: string;
}

const STAT_FIELDS: { key: keyof StatValues; label: string; unit: string }[] = [
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'steps', label: 'Steps', unit: 'steps' },
  { key: 'exerciseMinutes', label: 'Exercise', unit: 'min' },
  { key: 'walkRunDistance', label: 'Walk / Run', unit: 'km' },
  { key: 'sleepHours', label: 'Sleep', unit: 'hrs' },
];

interface Props {
  values: StatValues;
  onChange: (field: keyof StatValues, value: string) => void;
}

export function CheckInStatsSection({ values, onChange }: Props) {
  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-4">
        Body &amp; Activity
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {STAT_FIELDS.map(({ key, label, unit }) => (
          <div key={key} className="bg-white/[.03] rounded-lg p-3">
            <div className="text-[10px] text-foreground/40 mb-1">{label}</div>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={values[key]}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder="—"
              aria-label={label}
              className="w-full bg-transparent text-[15px] font-bold text-foreground placeholder:text-foreground/20 outline-none"
            />
            <div className="text-[10px] text-foreground/40 mt-1">{unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
