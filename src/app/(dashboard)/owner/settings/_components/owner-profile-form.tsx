'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateOwnerProfileAction, type UpdateProfileState } from '../actions';

interface InitialProfile {
  phone: string | null;
  gymName: string | null;
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

export function OwnerProfileForm({ initialProfile }: Props) {
  const [state, action] = useActionState<UpdateProfileState, FormData>(
    updateOwnerProfileAction,
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
          htmlFor="gymName"
          className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]"
        >
          Gym Name
        </label>
        <Input
          id="gymName"
          name="gymName"
          type="text"
          defaultValue={initialProfile.gymName ?? ''}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
          placeholder="e.g. Power Gym Beijing"
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
