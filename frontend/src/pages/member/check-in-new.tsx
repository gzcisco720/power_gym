import { useReducer, useMemo } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useCheckInsStore } from '@/stores/checkInsStore';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { variants } from '@/lib/animations/variants';
import { type SubmitCheckInData } from '@/api/check-ins';

type StuckToDiet = 'yes' | 'no' | 'partial';

interface RatingField {
  key: keyof Pick<SubmitCheckInData, 'sleepQuality' | 'stress' | 'fatigue' | 'hunger' | 'recovery' | 'energy' | 'digestion'>;
  label: string;
}

const RATING_FIELDS: RatingField[] = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'energy', label: 'Energy' },
  { key: 'digestion', label: 'Digestion' },
];

interface FormState {
  ratings: Record<string, string>;
  stuckToDiet: StuckToDiet;
  dietDetails: string;
  wellbeing: string;
  notes: string;
  submitted: boolean;
  isSubmitting: boolean;
  validationError: string;
}

type FormAction =
  | { type: 'SET_RATING'; key: string; value: string }
  | { type: 'SET_STUCK'; value: StuckToDiet }
  | { type: 'SET_DIET_DETAILS'; value: string }
  | { type: 'SET_WELLBEING'; value: string }
  | { type: 'SET_NOTES'; value: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_VALIDATION_ERROR'; value: string }
  | { type: 'SET_SUBMITTED' };

const DEFAULT_RATINGS: Record<string, string> = {
  sleepQuality: '5', stress: '5', fatigue: '5',
  hunger: '5', recovery: '5', energy: '5', digestion: '5',
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_RATING': return { ...state, ratings: { ...state.ratings, [action.key]: action.value } };
    case 'SET_STUCK': return { ...state, stuckToDiet: action.value };
    case 'SET_DIET_DETAILS': return { ...state, dietDetails: action.value };
    case 'SET_WELLBEING': return { ...state, wellbeing: action.value };
    case 'SET_NOTES': return { ...state, notes: action.value };
    case 'SET_SUBMITTING': return { ...state, isSubmitting: action.value };
    case 'SET_VALIDATION_ERROR': return { ...state, validationError: action.value };
    case 'SET_SUBMITTED': return { ...state, submitted: true, isSubmitting: false };
    default: return state;
  }
}

function parseRating(value: string): number | null {
  const n = parseInt(value, 10);
  return !isNaN(n) && n >= 1 && n <= 10 ? n : null;
}

export function MemberCheckInNewPage() {
  const shouldReduceMotion = useReducedMotion();
  const { submitCheckIn, error } = useCheckInsStore();

  const [state, dispatch] = useReducer(formReducer, {
    ratings: { ...DEFAULT_RATINGS },
    stuckToDiet: 'yes',
    dietDetails: '',
    wellbeing: '',
    notes: '',
    submitted: false,
    isSubmitting: false,
    validationError: '',
  });

  const parsedRatings = useMemo(() => {
    const result: Record<string, number | null> = {};
    for (const f of RATING_FIELDS) {
      result[f.key] = parseRating(state.ratings[f.key]);
    }
    return result;
  }, [state.ratings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation: all 7 rating fields must have valid values 1-10
    const missingField = RATING_FIELDS.find((f) => parsedRatings[f.key] === null);
    if (missingField) {
      dispatch({ type: 'SET_VALIDATION_ERROR', value: `Please enter a value (1–10) for ${missingField.label}. All ratings are required.` });
      return;
    }

    dispatch({ type: 'SET_VALIDATION_ERROR', value: '' });
    dispatch({ type: 'SET_SUBMITTING', value: true });

    try {
      await submitCheckIn({
        sleepQuality: parsedRatings['sleepQuality']!,
        stress: parsedRatings['stress']!,
        fatigue: parsedRatings['fatigue']!,
        hunger: parsedRatings['hunger']!,
        recovery: parsedRatings['recovery']!,
        energy: parsedRatings['energy']!,
        digestion: parsedRatings['digestion']!,
        stuckToDiet: state.stuckToDiet,
        dietDetails: state.dietDetails || null,
        wellbeing: state.wellbeing || null,
        notes: state.notes || null,
      });
      dispatch({ type: 'SET_SUBMITTED' });
    } catch {
      // error already set in store
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  }

  if (error === 'already_submitted') {
    return (
      <LazyMotion features={domAnimation}>
        <PageHeader title="Weekly Check-In" subtitle="Log your progress for this week" />
        <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto">
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6 text-center">
            <p className="text-sm text-foreground/65">You&apos;ve already submitted your check-in this week.</p>
            <p className="mt-1 text-xs text-foreground/40">Check back next week.</p>
          </div>
        </div>
      </LazyMotion>
    );
  }

  if (state.submitted) {
    return (
      <LazyMotion features={domAnimation}>
        <PageHeader title="Weekly Check-In" subtitle="Log your progress for this week" />
        <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto">
          <m.div
            className="rounded-xl bg-card ring-1 ring-foreground/10 p-6 text-center"
            variants={shouldReduceMotion ? undefined : variants.scaleIn}
            initial="hidden"
            animate="visible"
          >
            <div className="text-[15px] font-semibold text-foreground mb-2">Check-in submitted successfully!</div>
            <p className="text-xs text-foreground/65">Great work. Keep it up!</p>
          </m.div>
        </div>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader title="Weekly Check-In" subtitle="Log your progress for this week" />
      <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Wellness ratings */}
          <section>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              How are you feeling?
            </p>
            <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-3 space-y-3">
              {RATING_FIELDS.map(({ key, label }) => {
                const inputId = `metric-${key}`;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <label
                      htmlFor={inputId}
                      className="text-sm text-foreground/80 w-32 shrink-0"
                    >
                      {label}
                    </label>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        id={inputId}
                        type="text"
                        inputMode="numeric"
                        value={state.ratings[key] ?? '5'}
                        onChange={(e) => dispatch({ type: 'SET_RATING', key, value: e.target.value })}
                        aria-label={label}
                        className="w-16 rounded-lg bg-background px-3 py-2 text-sm text-center text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <span className="text-xs text-foreground/65">/10</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Diet adherence */}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Stuck to diet?
            </p>
            <div className="flex gap-2">
              {(['yes', 'partial', 'no'] as StuckToDiet[]).map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant={state.stuckToDiet === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_STUCK', value: v })}
                >
                  {v === 'yes' ? 'Yes' : v === 'partial' ? 'Partial' : 'No'}
                </Button>
              ))}
            </div>
          </section>

          {/* Diet notes */}
          <div className="space-y-1.5">
            <label htmlFor="diet-details" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Diet notes <span className="text-foreground/40 normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="diet-details"
              value={state.dietDetails}
              onChange={(e) => dispatch({ type: 'SET_DIET_DETAILS', value: e.target.value })}
              placeholder="Describe your diet this week..."
              rows={3}
              className="w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* Wellbeing */}
          <div className="space-y-1.5">
            <label htmlFor="wellbeing" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Wellbeing <span className="text-foreground/40 normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="wellbeing"
              value={state.wellbeing}
              onChange={(e) => dispatch({ type: 'SET_WELLBEING', value: e.target.value })}
              placeholder="How are you feeling overall?"
              rows={3}
              className="w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="check-in-notes" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Notes <span className="text-foreground/40 normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              id="check-in-notes"
              value={state.notes}
              onChange={(e) => dispatch({ type: 'SET_NOTES', value: e.target.value })}
              placeholder="Anything else to note?"
              rows={2}
              className="w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          {/* Validation / server errors */}
          {state.validationError && (
            <p className="text-[13px] text-destructive">{state.validationError}</p>
          )}
          {error && error !== 'already_submitted' && (
            <p className="text-[13px] text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={state.isSubmitting} className="w-full">
            {state.isSubmitting ? 'Submitting…' : 'Submit Check-In'}
          </Button>
        </form>
      </div>
    </LazyMotion>
  );
}
