'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateMemberProfileAction, type UpdateProfileState } from '../actions';

interface InitialProfile {
  phone: string | null;
  sex: 'male' | 'female' | null;
  dateOfBirth: string | null;
  height: number | null;
  fitnessGoal: string | null;
  fitnessLevel: string | null;
}

interface Props {
  initialProfile: InitialProfile;
}

const FITNESS_GOALS = [
  { value: 'lose_fat', label: '减脂' },
  { value: 'build_muscle', label: '增肌' },
  { value: 'maintain', label: '维持' },
  { value: 'improve_performance', label: '提升运动表现' },
] as const;

const FITNESS_LEVELS = [
  { value: 'beginner', label: '新手' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '进阶' },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Profile'}
    </Button>
  );
}

export function MemberProfileForm({ initialProfile }: Props) {
  const [state, action] = useActionState<UpdateProfileState, FormData>(
    updateMemberProfileAction,
    { error: '' },
  );

  const dobValue = initialProfile.dateOfBirth
    ? new Date(initialProfile.dateOfBirth).toISOString().split('T')[0]
    : '';

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <label
          htmlFor="phone"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Phone
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initialProfile.phone ?? ''}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555]"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="sex"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Sex
        </label>
        <select
          id="sex"
          name="sex"
          defaultValue={initialProfile.sex ?? ''}
          className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white"
        >
          <option value="">-- Select --</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="dateOfBirth"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Date of Birth
        </label>
        <Input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={dobValue}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="height"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Height (cm)
        </label>
        <Input
          id="height"
          name="height"
          type="number"
          min={100}
          max={250}
          defaultValue={initialProfile.height ?? ''}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="fitnessGoal"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Fitness Goal
        </label>
        <select
          id="fitnessGoal"
          name="fitnessGoal"
          defaultValue={initialProfile.fitnessGoal ?? ''}
          className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white"
        >
          <option value="">-- Select --</option>
          {FITNESS_GOALS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="fitnessLevel"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Fitness Level
        </label>
        <select
          id="fitnessLevel"
          name="fitnessLevel"
          defaultValue={initialProfile.fitnessLevel ?? ''}
          className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white"
        >
          <option value="">-- Select --</option>
          {FITNESS_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
