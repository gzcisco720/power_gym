'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AvatarUpload } from '@/components/settings/avatar-upload';
import { updateMemberProfileAction } from '../actions';

interface Props {
  firstName: string;
  lastName: string;
  mobile: string | null;
  address: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  sex: 'male' | 'female' | null;
  fitnessGoal: string | null;
  fitnessLevel: string | null;
}

const FITNESS_GOALS = [
  { value: 'lose_fat', label: 'Lose Fat' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'improve_performance', label: 'Improve Performance' },
] as const;

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export function MemberProfileTab(props: Props) {
  const [avatarUrl, setAvatarUrl] = useState(props.avatarUrl);
  const [saving, setSaving] = useState(false);
  const userInitials = `${props.firstName[0] ?? ''}${props.lastName[0] ?? ''}`.toUpperCase();
  const dobValue = props.dateOfBirth
    ? new Date(props.dateOfBirth).toISOString().split('T')[0]
    : '';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    if (avatarUrl) formData.set('avatarUrl', avatarUrl);
    const result = await updateMemberProfileAction({ error: '' }, formData);
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success('Profile saved');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <AvatarUpload avatarUrl={avatarUrl} initials={userInitials} onUpload={setAvatarUrl} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            First Name <span className="text-destructive">*</span>
          </label>
          <Input id="firstName" name="firstName" required defaultValue={props.firstName} className="bg-card border-foreground/10 text-foreground" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
            Last Name <span className="text-destructive">*</span>
          </label>
          <Input id="lastName" name="lastName" required defaultValue={props.lastName} className="bg-card border-foreground/10 text-foreground" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="dateOfBirth" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Date of Birth</label>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={dobValue} className="bg-card border-foreground/10 text-foreground" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="mobile" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Mobile <span className="text-foreground/40 normal-case font-normal text-xs">(optional)</span>
        </label>
        <Input id="mobile" name="mobile" type="tel" defaultValue={props.mobile ?? ''} placeholder="+1 234 567 8900" className="bg-card border-foreground/10 text-foreground" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
          Address <span className="text-foreground/40 normal-case font-normal text-xs">(optional)</span>
        </label>
        <Input id="address" name="address" defaultValue={props.address ?? ''} className="bg-card border-foreground/10 text-foreground" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sex" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Sex</label>
        <select id="sex" name="sex" defaultValue={props.sex ?? ''} className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
          <option value="">-- Select --</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fitnessGoal" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Fitness Goal</label>
        <select id="fitnessGoal" name="fitnessGoal" defaultValue={props.fitnessGoal ?? ''} className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
          <option value="">-- Select --</option>
          {FITNESS_GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fitnessLevel" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Fitness Level</label>
        <select id="fitnessLevel" name="fitnessLevel" defaultValue={props.fitnessLevel ?? ''} className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
          <option value="">-- Select --</option>
          {FITNESS_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex justify-end">
        <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
