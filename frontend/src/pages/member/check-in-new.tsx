import { useState } from 'react';
import { useCheckInsStore } from '@/stores/checkInsStore';
import { Button } from '@/components/ui/button';
import { type SubmitCheckInData } from '@/api/check-ins';

type StuckToDiet = 'yes' | 'no' | 'partial';

const METRIC_FIELDS: Array<{ key: keyof SubmitCheckInData; label: string }> = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'energy', label: 'Energy' },
  { key: 'digestion', label: 'Digestion' },
];

export function MemberCheckInNewPage() {
  const { submitCheckIn, error } = useCheckInsStore();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [metrics, setMetrics] = useState<Record<string, number>>({
    sleepQuality: 5, stress: 5, fatigue: 5, hunger: 5,
    recovery: 5, energy: 5, digestion: 5,
  });
  const [stuckToDiet, setStuckToDiet] = useState<StuckToDiet>('yes');
  const [dietDetails, setDietDetails] = useState('');
  const [wellbeing, setWellbeing] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitCheckIn({
        sleepQuality: metrics.sleepQuality,
        stress: metrics.stress,
        fatigue: metrics.fatigue,
        hunger: metrics.hunger,
        recovery: metrics.recovery,
        energy: metrics.energy,
        digestion: metrics.digestion,
        stuckToDiet,
        dietDetails: dietDetails || null,
        wellbeing: wellbeing || null,
      });
      setSubmitted(true);
    } catch {
      // error was already set in the store by submitCheckIn
    } finally {
      setIsSubmitting(false);
    }
  }

  if (error === 'already_submitted') {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Weekly Check-In</h1>
        <p className="text-sm text-foreground/65">You've already submitted your check-in this week.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-bold text-foreground">Weekly Check-In</h1>
        <p className="text-sm text-foreground/65">Check-in submitted successfully!</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Weekly Check-In</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="mb-4 text-sm font-semibold text-foreground/65 uppercase tracking-wider">
            How are you feeling?
          </p>
          <div className="space-y-3">
            {METRIC_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <label className="text-sm text-foreground/80 w-32 shrink-0">{label}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9]|10"
                  value={metrics[key as string] ?? 5}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v >= 1 && v <= 10) {
                      setMetrics((m) => ({ ...m, [key]: v }));
                    }
                  }}
                  className="w-16 rounded-lg bg-background px-3 py-2 text-sm text-center text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-xs text-foreground/65">/10</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-foreground/65 uppercase tracking-wider">
            Stuck to diet?
          </p>
          <div className="flex gap-2">
            {(['yes', 'partial', 'no'] as StuckToDiet[]).map((v) => (
              <Button
                key={v}
                type="button"
                variant={stuckToDiet === v ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStuckToDiet(v)}
              >
                {v === 'yes' ? 'Yes' : v === 'partial' ? 'Partial' : 'No'}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-foreground/80">Diet notes</label>
          <textarea
            value={dietDetails}
            onChange={(e) => setDietDetails(e.target.value)}
            placeholder="Describe your diet this week..."
            rows={3}
            className="w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-foreground/80">Wellbeing</label>
          <textarea
            value={wellbeing}
            onChange={(e) => setWellbeing(e.target.value)}
            placeholder="How are you feeling overall?"
            rows={3}
            className="w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        {error && error !== 'already_submitted' && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit Check-In'}
        </Button>
      </form>
    </div>
  );
}
