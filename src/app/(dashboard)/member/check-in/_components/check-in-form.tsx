'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { createCheckInAction, getCheckInSignatureAction } from '../actions';

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

  if (alreadySubmitted || submitted) {
    return (
      <div className="rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-6 text-center">
        <p className="text-[#888]">You&apos;ve already submitted your check-in this week.</p>
        <p className="mt-1 text-[12px] text-[#555]">Check back next week.</p>
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
      const sigResult = await getCheckInSignatureAction();
      if (sigResult.error) { setError(sigResult.error); return; }

      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('api_key', sigResult.apiKey!);
        fd.append('timestamp', String(sigResult.timestamp!));
        fd.append('signature', sigResult.signature!);
        fd.append('folder', sigResult.folder!);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sigResult.cloudName}/image/upload`,
          { method: 'POST', body: fd },
        );
        const data = await res.json() as { secure_url?: string; error?: { message: string } };
        if (data.error) throw new Error(data.error.message);
        urls.push(data.secure_url!);
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
        setSubmitted(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Ratings */}
      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
          Weekly Ratings (1–10)
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {RATINGS.map(({ key, label }) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[13px] text-[#888]">{label}</label>
                <span className="text-[13px] font-semibold text-white">{ratings[key]}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={ratings[key]}
                onChange={(e) => setRatings((r) => ({ ...r, [key]: Number(e.target.value) }))}
                className="w-full accent-white"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
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
              <label className="mb-1 block text-[12px] text-[#666]">{label}</label>
              <Input
                type="number"
                step="any"
                value={val}
                onChange={(e) => set(e.target.value)}
                className="border-[#1a1a1a] bg-[#0d0d0d] text-white placeholder:text-[#333]"
                placeholder="—"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Diet */}
      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
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
                  ? 'border-white bg-white text-black'
                  : 'border-[#222] text-[#666] hover:border-[#444] hover:text-[#999]',
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
          className="border-[#1a1a1a] bg-[#0d0d0d] text-white placeholder:text-[#333]"
          rows={3}
        />
      </section>

      {/* Wellbeing & Notes */}
      <section className="space-y-4">
        <div>
          <label className="mb-1 block text-[13px] text-[#888]">Wellbeing</label>
          <Textarea
            value={wellbeing}
            onChange={(e) => setWellbeing(e.target.value)}
            placeholder="How are you feeling overall?"
            className="border-[#1a1a1a] bg-[#0d0d0d] text-white placeholder:text-[#333]"
            rows={3}
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] text-[#888]">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else to share?"
            className="border-[#1a1a1a] bg-[#0d0d0d] text-white placeholder:text-[#333]"
            rows={3}
          />
        </div>
      </section>

      {/* Photos */}
      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
          Progress Photos (max 5)
        </h3>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={photos.length >= 5 || uploadingPhotos}
          onChange={handlePhotoChange}
          className="text-[13px] text-[#888] file:mr-4 file:rounded-md file:border file:border-[#222] file:bg-transparent file:px-3 file:py-1 file:text-[12px] file:text-[#888] disabled:opacity-50"
        />
        {uploadingPhotos && <p className="mt-2 text-[12px] text-[#555]">Uploading...</p>}
        {photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-16 w-16 rounded object-cover" />
            ))}
          </div>
        )}
      </section>

      {error && <p className="text-[13px] text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={isPending || uploadingPhotos}
        className="w-full bg-white font-semibold text-black hover:bg-white/90 disabled:opacity-50"
      >
        {isPending ? 'Submitting...' : 'Submit Check-In'}
      </Button>
    </form>
  );
}
