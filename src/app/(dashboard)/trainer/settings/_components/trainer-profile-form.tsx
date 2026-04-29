'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateTrainerProfileAction, type UpdateProfileState } from '../actions';

interface InitialProfile {
  phone: string | null;
  bio: string | null;
  specializations: string[];
}

interface Props {
  initialProfile: InitialProfile;
}

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

export function TrainerProfileForm({ initialProfile }: Props) {
  const [state, action] = useActionState<UpdateProfileState, FormData>(
    updateTrainerProfileAction,
    { error: '' },
  );

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
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="bio"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Bio
        </label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={initialProfile.bio ?? ''}
          rows={4}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
          placeholder="Certifications, experience, specialties..."
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="specializations"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Specializations
        </label>
        <Input
          id="specializations"
          name="specializations"
          type="text"
          defaultValue={initialProfile.specializations.join(', ')}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
          placeholder="strength, rehabilitation, nutrition (comma-separated)"
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
