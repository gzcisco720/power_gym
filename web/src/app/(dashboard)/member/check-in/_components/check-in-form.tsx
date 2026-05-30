'use client';

import { useReducer, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { createCheckInAction, getCheckInSignatureAction } from '../actions';
import { uploadFile } from '@/lib/storage/upload-file';
import { CheckInAnimation } from '@/components/animations/check-in';
import { StreakMilestoneAnimation } from '@/components/animations/streak-milestone';
import { CheckInFeelingsSection } from './check-in-feelings-section';
import { CheckInStatsSection } from './check-in-stats-section';
import { CheckInDietSection } from './check-in-diet-section';
import { CheckInPhotosSection } from './check-in-photos-section';

const MILESTONES = [7, 14, 30, 60, 100];

interface RatingFields {
  sleepQuality: number;
  energy: number;
  recovery: number;
  stress: number;
  fatigue: number;
  hunger: number;
  digestion: number;
}

interface StatValues {
  weight: string;
  waist: string;
  steps: string;
  exerciseMinutes: string;
  walkRunDistance: string;
  sleepHours: string;
}

const DEFAULT_RATINGS: RatingFields = {
  sleepQuality: 5, energy: 5, recovery: 5,
  stress: 5, fatigue: 5, hunger: 5, digestion: 5,
};

interface CheckInState {
  ratings: RatingFields;
  stats: StatValues;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  photos: string[];
  uploadingPhotos: boolean;
  error: string;
  submitted: boolean;
  celebration: 'check-in' | 'milestone' | null;
  celebrationData: { streakDays: number; weekDots: boolean[] } | null;
}

type CheckInAction =
  | { type: 'SET_RATINGS'; value: RatingFields }
  | { type: 'SET_STATS'; value: StatValues }
  | { type: 'SET_DIET_DETAILS'; value: string }
  | { type: 'SET_STUCK_TO_DIET'; value: 'yes' | 'no' | 'partial' }
  | { type: 'SET_WELLBEING'; value: string }
  | { type: 'SET_NOTES'; value: string }
  | { type: 'SET_PHOTOS'; value: string[] }
  | { type: 'SET_UPLOADING_PHOTOS'; value: boolean }
  | { type: 'SET_ERROR'; value: string }
  | { type: 'SET_SUBMITTED'; value: boolean }
  | { type: 'SET_CELEBRATION'; value: 'check-in' | 'milestone' | null }
  | { type: 'SET_CELEBRATION_DATA'; value: { streakDays: number; weekDots: boolean[] } | null };

function checkInReducer(state: CheckInState, action: CheckInAction): CheckInState {
  switch (action.type) {
    case 'SET_RATINGS': return { ...state, ratings: action.value };
    case 'SET_STATS': return { ...state, stats: action.value };
    case 'SET_DIET_DETAILS': return { ...state, dietDetails: action.value };
    case 'SET_STUCK_TO_DIET': return { ...state, stuckToDiet: action.value };
    case 'SET_WELLBEING': return { ...state, wellbeing: action.value };
    case 'SET_NOTES': return { ...state, notes: action.value };
    case 'SET_PHOTOS': return { ...state, photos: action.value };
    case 'SET_UPLOADING_PHOTOS': return { ...state, uploadingPhotos: action.value };
    case 'SET_ERROR': return { ...state, error: action.value };
    case 'SET_SUBMITTED': return { ...state, submitted: action.value };
    case 'SET_CELEBRATION': return { ...state, celebration: action.value };
    case 'SET_CELEBRATION_DATA': return { ...state, celebrationData: action.value };
    default: return state;
  }
}

interface Props {
  alreadySubmitted: boolean;
}

export function CheckInForm({ alreadySubmitted }: Props) {
  const [state, dispatch] = useReducer(checkInReducer, {
    ratings: DEFAULT_RATINGS,
    stats: { weight: '', waist: '', steps: '', exerciseMinutes: '', walkRunDistance: '', sleepHours: '' },
    dietDetails: '',
    stuckToDiet: 'yes',
    wellbeing: '',
    notes: '',
    photos: [],
    uploadingPhotos: false,
    error: '',
    submitted: false,
    celebration: null,
    celebrationData: null,
  });
  const { ratings, stats, dietDetails, stuckToDiet, wellbeing, notes, photos, uploadingPhotos, error, submitted, celebration, celebrationData } = state;
  const [isPending, startTransition] = useTransition();

  if (alreadySubmitted || submitted) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-6 text-center">
        <p className="text-foreground/65">You&apos;ve already submitted your check-in this week.</p>
        <p className="mt-1 text-[12px] text-foreground/40">Check back next week.</p>
      </div>
    );
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (photos.length + files.length > 5) {
      dispatch({ type: 'SET_ERROR', value: 'Maximum 5 photos allowed' });
      return;
    }
    dispatch({ type: 'SET_UPLOADING_PHOTOS', value: true });
    dispatch({ type: 'SET_ERROR', value: '' });
    try {
      const result = await getCheckInSignatureAction();
      if (result.error) { dispatch({ type: 'SET_ERROR', value: result.error }); return; }
      const urls = await Promise.all(files.map((file) => uploadFile(file, result.config!)));
      dispatch({ type: 'SET_PHOTOS', value: [...photos, ...urls] });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', value: err instanceof Error ? err.message : 'Photo upload failed' });
    } finally {
      dispatch({ type: 'SET_UPLOADING_PHOTOS', value: false });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({ type: 'SET_ERROR', value: '' });
    startTransition(async () => {
      const result = await createCheckInAction({
        ...ratings,
        weight: stats.weight ? Number(stats.weight) : null,
        waist: stats.waist ? Number(stats.waist) : null,
        steps: stats.steps ? Number(stats.steps) : null,
        exerciseMinutes: stats.exerciseMinutes ? Number(stats.exerciseMinutes) : null,
        walkRunDistance: stats.walkRunDistance ? Number(stats.walkRunDistance) : null,
        sleepHours: stats.sleepHours ? Number(stats.sleepHours) : null,
        dietDetails,
        stuckToDiet,
        wellbeing,
        notes,
        photos,
      });
      if (result.error) {
        dispatch({ type: 'SET_ERROR', value: result.error });
      } else {
        const streakDays = 0;
        const todayDow = new Date().getDay();
        const weekDots = Array.from({ length: 7 }, (_, i) => i === todayDow);
        dispatch({ type: 'SET_CELEBRATION', value: MILESTONES.includes(streakDays) ? 'milestone' : 'check-in' });
        dispatch({ type: 'SET_CELEBRATION_DATA', value: { streakDays, weekDots } });
        dispatch({ type: 'SET_SUBMITTED', value: true });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CheckInFeelingsSection
        ratings={ratings}
        onChange={(key, value) => dispatch({ type: 'SET_RATINGS', value: { ...ratings, [key]: value } })}
      />

      <CheckInStatsSection
        values={stats}
        onChange={(field, value) => dispatch({ type: 'SET_STATS', value: { ...stats, [field]: value } })}
      />

      <CheckInDietSection
        stuckToDiet={stuckToDiet}
        onStuckToDiet={(v) => dispatch({ type: 'SET_STUCK_TO_DIET', value: v })}
        dietDetails={dietDetails}
        onDietDetails={(v) => dispatch({ type: 'SET_DIET_DETAILS', value: v })}
        wellbeing={wellbeing}
        onWellbeing={(v) => dispatch({ type: 'SET_WELLBEING', value: v })}
        notes={notes}
        onNotes={(v) => dispatch({ type: 'SET_NOTES', value: v })}
      />

      <CheckInPhotosSection
        photos={photos}
        uploading={uploadingPhotos}
        onFileChange={handlePhotoChange}
      />

      {error && <p className="text-[13px] text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isPending || uploadingPhotos}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-50"
      >
        {isPending ? 'Submitting...' : 'Submit Check-In'}
      </Button>

      {celebration === 'milestone' && celebrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white/[.04] ring-1 ring-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-xs mx-4">
            <StreakMilestoneAnimation
              days={celebrationData.streakDays}
              onComplete={() => dispatch({ type: 'SET_CELEBRATION', value: null })}
            />
          </div>
        </div>
      )}
      {celebration === 'check-in' && celebrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white/[.04] ring-1 ring-white/10 backdrop-blur-md rounded-2xl p-6 w-full max-w-xs mx-4">
            <CheckInAnimation
              streakDays={celebrationData.streakDays}
              weekDots={celebrationData.weekDots}
              onComplete={() => dispatch({ type: 'SET_CELEBRATION', value: null })}
            />
          </div>
        </div>
      )}
    </form>
  );
}
