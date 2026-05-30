import { useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { useMemberCheckInStore } from '@/stores/memberCheckInStore';
import type { CheckInPayload } from '@/api/check-ins';

// ─── Rating fields ─────────────────────────────────────────────────────────────

interface RatingFields {
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
}

const DEFAULT_RATINGS: RatingFields = {
  sleepQuality: 5,
  energy: 5,
  recovery: 5,
  stress: 5,
  fatigue: 5,
  hunger: 5,
  digestion: 5,
};

const RATING_LABELS: { key: keyof RatingFields; label: string }[] = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'energy', label: 'Energy' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'digestion', label: 'Digestion' },
];

// ─── Reducer ───────────────────────────────────────────────────────────────────

interface FormState {
  ratings: RatingFields;
  weight: string;
  waist: string;
  steps: string;
  exerciseMinutes: string;
  walkRunDistance: string;
  sleepHours: string;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  submitted: boolean;
}

type FormAction =
  | { type: 'SET_RATING'; key: keyof RatingFields; value: number }
  | { type: 'SET_FIELD'; key: keyof Omit<FormState, 'ratings' | 'stuckToDiet' | 'submitted'>; value: string }
  | { type: 'SET_STUCK'; value: 'yes' | 'no' | 'partial' }
  | { type: 'SUBMITTED' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_RATING':
      return { ...state, ratings: { ...state.ratings, [action.key]: action.value } };
    case 'SET_FIELD':
      return { ...state, [action.key]: action.value };
    case 'SET_STUCK':
      return { ...state, stuckToDiet: action.value };
    case 'SUBMITTED':
      return { ...state, submitted: true };
    default:
      return state;
  }
}

// ─── CheckInForm ───────────────────────────────────────────────────────────────

interface Props {
  alreadySubmitted: boolean;
}

export function CheckInForm({ alreadySubmitted }: Props) {
  const navigate = useNavigate();
  const submit = useMemberCheckInStore((s) => s.submit);
  const isSubmitting = useMemberCheckInStore((s) => s.isSubmitting);
  const [error, setError] = useState('');

  const [state, dispatch] = useReducer(formReducer, {
    ratings: DEFAULT_RATINGS,
    weight: '',
    waist: '',
    steps: '',
    exerciseMinutes: '',
    walkRunDistance: '',
    sleepHours: '',
    dietDetails: '',
    stuckToDiet: 'yes',
    wellbeing: '',
    notes: '',
    submitted: false,
  });

  if (alreadySubmitted || state.submitted) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-6 text-center">
        <p className="text-foreground/65">You&apos;ve already submitted your check-in this week.</p>
        <p className="mt-1 text-[12px] text-foreground/40">Check back next week.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload: CheckInPayload = {
      ...state.ratings,
      weight: state.weight ? Number(state.weight) : null,
      waist: state.waist ? Number(state.waist) : null,
      steps: state.steps ? Number(state.steps) : null,
      exerciseMinutes: state.exerciseMinutes ? Number(state.exerciseMinutes) : null,
      walkRunDistance: state.walkRunDistance ? Number(state.walkRunDistance) : null,
      sleepHours: state.sleepHours ? Number(state.sleepHours) : null,
      dietDetails: state.dietDetails,
      stuckToDiet: state.stuckToDiet,
      wellbeing: state.wellbeing,
      notes: state.notes,
      photos: [],
    };
    try {
      await submit(payload);
      toast.success('Check-in submitted!');
      dispatch({ type: 'SUBMITTED' });
      navigate('/member/check-in');
    } catch {
      setError('Failed to submit check-in. Please try again.');
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
      {/* Feelings */}
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-4">
          How are you feeling?
        </h3>
        <div className="space-y-3">
          {RATING_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-[12px] text-foreground/65 w-24 shrink-0">{label}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={state.ratings[key]}
                onChange={(e) => dispatch({ type: 'SET_RATING', key, value: Number(e.target.value) })}
                aria-label={label}
                className="flex-1 accent-primary"
              />
              <span className="text-[13px] font-semibold text-primary-light w-5 text-right tabular-nums">
                {state.ratings[key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Body metrics */}
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-4">
          Body Metrics <span className="text-foreground/40 normal-case">(optional)</span>
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { key: 'weight', label: 'Weight (kg)' },
              { key: 'waist', label: 'Waist (cm)' },
              { key: 'sleepHours', label: 'Sleep (hrs)' },
              { key: 'steps', label: 'Steps' },
              { key: 'exerciseMinutes', label: 'Exercise (min)' },
              { key: 'walkRunDistance', label: 'Walk/Run (km)' },
            ] as const
          ).map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label
                htmlFor={`field-${key}`}
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                {label}
              </label>
              <input
                id={`field-${key}`}
                type="text"
                inputMode="decimal"
                value={state[key]}
                onChange={(e) => dispatch({ type: 'SET_FIELD', key, value: e.target.value })}
                className="w-full rounded-lg bg-input border border-foreground/10 px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Diet */}
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-4">
          Diet &amp; Wellbeing
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Stuck to diet?
            </label>
            <div className="flex gap-2">
              {(['yes', 'no', 'partial'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => dispatch({ type: 'SET_STUCK', value: v })}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-semibold capitalize border transition-colors ${
                    state.stuckToDiet === v
                      ? 'bg-primary/20 border-primary/40 text-primary-light'
                      : 'bg-white/[.02] border-foreground/10 text-foreground/65 hover:bg-white/[.04]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="field-dietDetails"
              className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
            >
              Diet details <span className="text-foreground/40 normal-case">(optional)</span>
            </label>
            <textarea
              id="field-dietDetails"
              rows={2}
              value={state.dietDetails}
              onChange={(e) => dispatch({ type: 'SET_FIELD', key: 'dietDetails', value: e.target.value })}
              className="w-full rounded-lg bg-input border border-foreground/10 px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="field-wellbeing"
              className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
            >
              Wellbeing notes <span className="text-foreground/40 normal-case">(optional)</span>
            </label>
            <textarea
              id="field-wellbeing"
              rows={2}
              value={state.wellbeing}
              onChange={(e) => dispatch({ type: 'SET_FIELD', key: 'wellbeing', value: e.target.value })}
              className="w-full rounded-lg bg-input border border-foreground/10 px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="field-notes"
              className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
            >
              Additional notes <span className="text-foreground/40 normal-case">(optional)</span>
            </label>
            <textarea
              id="field-notes"
              rows={2}
              value={state.notes}
              onChange={(e) => dispatch({ type: 'SET_FIELD', key: 'notes', value: e.target.value })}
              className="w-full rounded-lg bg-input border border-foreground/10 px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Check-In'}
      </Button>
    </form>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function MemberCheckInNewPage() {
  const hasThisWeek = useMemberCheckInStore((s) => s.hasThisWeek);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Weekly Check-In" subtitle="Submit your check-in for this week" />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto w-full">
        <CheckInForm alreadySubmitted={hasThisWeek} />
      </div>
    </div>
  );
}
