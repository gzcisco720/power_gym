'use client';

import { useState, useTransition } from 'react';
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

interface Props {
  alreadySubmitted: boolean;
}

export function CheckInForm({ alreadySubmitted }: Props) {
  const [ratings, setRatings] = useState<RatingFields>(DEFAULT_RATINGS);
  const [stats, setStats] = useState<StatValues>({
    weight: '', waist: '', steps: '',
    exerciseMinutes: '', walkRunDistance: '', sleepHours: '',
  });
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
      const urls = await Promise.all(files.map((file) => uploadFile(file, result.config!)));
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <CheckInFeelingsSection
        ratings={ratings}
        onChange={(key, value) => setRatings((r) => ({ ...r, [key]: value }))}
      />

      <CheckInStatsSection
        values={stats}
        onChange={(field, value) => setStats((s) => ({ ...s, [field]: value }))}
      />

      <CheckInDietSection
        stuckToDiet={stuckToDiet}
        onStuckToDiet={setStuckToDiet}
        dietDetails={dietDetails}
        onDietDetails={setDietDetails}
        wellbeing={wellbeing}
        onWellbeing={setWellbeing}
        notes={notes}
        onNotes={setNotes}
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
