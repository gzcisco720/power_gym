'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { createCheckInAction, getCheckInSignatureAction } from '../actions';
import { uploadFile } from '@/lib/storage/upload-file';
import { CheckInAnimation } from '@/components/animations/check-in';
import { StreakMilestoneAnimation } from '@/components/animations/streak-milestone';

const MILESTONES = [7, 14, 30, 60, 100];

interface Props {
  alreadySubmitted: boolean;
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
  sleepQuality: 5, energy: 5, recovery: 5,
  stress: 5, fatigue: 5, hunger: 5, digestion: 5,
};

export function CheckInForm({ alreadySubmitted }: Props) {
  const [ratings, setRatings] = useState<RatingFields>(DEFAULT_RATINGS);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [steps, setSteps] = useState('');
  const [exerciseMinutes, setExerciseMinutes] = useState('');
  const [walkRunDistance, setWalkRunDistance] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [dietDetails, setDietDetails] = useState('');
  const [stuckToDiet, setStuckToDiet] = useState<'yes' | 'no' | 'partial'>('yes');
  const [wellbeing, setWellbeing] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [celebration, setCelebration] = useState<'check-in' | 'milestone' | null>(null);
  const [celebrationData, setCelebrationData] = useState<{
    streakDays: number;
    weekDots: boolean[];
  } | null>(null);

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
      setError('Maximum 5 photos allowed');
      return;
    }
    setUploadingPhotos(true);
    setError('');
    try {
      const result = await getCheckInSignatureAction();
      if (result.error) { setError(result.error); return; }

      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadFile(file, result.config!);
        urls.push(url);
      }
      setPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingPhotos(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await createCheckInAction({
        ...ratings,
        weight: weight ? Number(weight) : null,
        waist: waist ? Number(waist) : null,
        steps: steps ? Number(steps) : null,
        exerciseMinutes: exerciseMinutes ? Number(exerciseMinutes) : null,
        walkRunDistance: walkRunDistance ? Number(walkRunDistance) : null,
        sleepHours: sleepHours ? Number(sleepHours) : null,
        dietDetails,
        stuckToDiet,
        wellbeing,
        notes,
        photos,
      });
      if (result.error) {
        setError(result.error);
      } else {
        const streakDays = 0;
        const todayDow = new Date().getDay();
        const weekDots = Array.from({ length: 7 }, (_, i) => i === todayDow);
        if (MILESTONES.includes(streakDays)) {
          setCelebration('milestone');
        } else {
          setCelebration('check-in');
        }
        setCelebrationData({ streakDays, weekDots });
        setSubmitted(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[.1em] text-foreground/65">
          Weekly Ratings (1–10)
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {RATINGS.map(({ key, label }) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[13px] text-foreground/65">{label}</label>
                <span className="text-[13px] font-semibold text-foreground">{ratings[key]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={ratings[key]}
                onChange={(e) => setRatings((r) => ({ ...r, [key]: Number(e.target.value) }))}
                className="w-full accent-primary"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[.1em] text-foreground/65">
          Weekly Stats
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: 'Weight (kg)', val: weight, set: setWeight },
            { label: 'Waist (cm)', val: waist, set: setWaist },
            { label: 'Steps', val: steps, set: setSteps },
            { label: 'Exercise (min)', val: exerciseMinutes, set: setExerciseMinutes },
            { label: 'Walk/Run (km)', val: walkRunDistance, set: setWalkRunDistance },
            { label: 'Sleep (hrs)', val: sleepHours, set: setSleepHours },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="mb-1 block text-[12px] text-foreground/65">{label}</label>
              <Input
                type="number"
                step="any"
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder="—"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[.1em] text-foreground/65">
          Diet Adherence
        </h3>
        <div className="mb-4 flex gap-2">
          {(['yes', 'partial', 'no'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setStuckToDiet(opt)}
              className={cn(
                'rounded-md border px-4 py-2 text-[12px] font-medium capitalize transition-colors',
                stuckToDiet === opt
                  ? 'border-primary bg-primary/15 text-primary-light'
                  : 'border-foreground/20 text-foreground/65 hover:border-foreground/40 hover:text-foreground/80',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        <Textarea
          value={dietDetails}
          onChange={(e) => setDietDetails(e.target.value)}
          placeholder="Describe your diet this week..."
          rows={3}
        />
      </section>

      <section className="space-y-4">
        <div>
          <label className="mb-1 block text-[13px] text-foreground/65">Wellbeing</label>
          <Textarea
            value={wellbeing}
            onChange={(e) => setWellbeing(e.target.value)}
            placeholder="How are you feeling overall?"
            rows={3}
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] text-foreground/65">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else to share?"
            rows={3}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[.1em] text-foreground/65">
          Progress Photos <span className="normal-case font-normal text-foreground/40">(max 5)</span>
        </h3>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={photos.length >= 5 || uploadingPhotos}
          onChange={handlePhotoChange}
          className="text-[12px] text-foreground/65 file:mr-3 file:rounded-md file:border file:border-foreground/20 file:bg-transparent file:px-3 file:py-1 file:text-[11px] file:text-foreground/65 file:transition-colors file:hover:border-foreground/40 disabled:opacity-50"
        />
        {uploadingPhotos && <p className="mt-2 text-[12px] text-foreground/65">Uploading...</p>}
        {photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-16 w-16 rounded object-cover ring-1 ring-foreground/[.1]" />
            ))}
          </div>
        )}
      </section>

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
              onComplete={() => setCelebration(null)}
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
              onComplete={() => setCelebration(null)}
            />
          </div>
        </div>
      )}
    </form>
  );
}
