import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  stuckToDiet: 'yes' | 'no' | 'partial';
  onStuckToDiet: (v: 'yes' | 'no' | 'partial') => void;
  dietDetails: string;
  onDietDetails: (v: string) => void;
  wellbeing: string;
  onWellbeing: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
}

const DIET_OPTIONS = [
  { value: 'yes' as const, label: 'Yes' },
  { value: 'partial' as const, label: 'Partial' },
  { value: 'no' as const, label: 'No' },
];

export function CheckInDietSection({
  stuckToDiet, onStuckToDiet,
  dietDetails, onDietDetails,
  wellbeing, onWellbeing,
  notes, onNotes,
}: Props) {
  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5 space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
        Diet &amp; Wellbeing
      </h3>

      <div>
        <p className="text-[12px] text-foreground/65 mb-2">Stuck to diet?</p>
        <div className="flex gap-2">
          {DIET_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onStuckToDiet(value)}
              className={cn(
                'rounded-md border px-4 py-2 text-[12px] font-medium transition-colors',
                stuckToDiet === value
                  ? 'border-primary bg-primary/15 text-primary-light'
                  : 'border-foreground/20 text-foreground/65 hover:border-foreground/40 hover:text-foreground/80',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Textarea
        value={dietDetails}
        onChange={(e) => onDietDetails(e.target.value)}
        placeholder="Describe your diet this week..."
        rows={3}
      />

      <div className="border-t border-foreground/[.06] pt-4 space-y-4">
        <Textarea
          value={wellbeing}
          onChange={(e) => onWellbeing(e.target.value)}
          placeholder="How are you feeling overall?"
          rows={3}
        />
        <Textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Anything else to share?"
          rows={3}
        />
      </div>
    </div>
  );
}
