'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateGymInfoAction } from '../actions';

interface GymInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
}

interface Props {
  gymInfo: GymInfo | null;
}

const GYM_FIELDS: { id: string; label: string; placeholder?: string }[] = [
  { id: 'gymName', label: 'Gym Name' },
  { id: 'gymAddress', label: 'Address' },
  { id: 'gymPhone', label: 'Phone' },
  { id: 'gymEmail', label: 'Email' },
  { id: 'gymWebsite', label: 'Website' },
  { id: 'gymHours', label: 'Hours', placeholder: 'Mon–Fri 6am–10pm' },
];

export function GymInfoTab({ gymInfo }: Props) {
  const [saving, setSaving] = useState(false);

  const fieldValues: Record<string, string | null | undefined> = {
    gymName: gymInfo?.name,
    gymAddress: gymInfo?.address,
    gymPhone: gymInfo?.phone,
    gymEmail: gymInfo?.email,
    gymWebsite: gymInfo?.website,
    gymHours: gymInfo?.hours,
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateGymInfoAction({ error: '' }, formData);
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success('Gym info saved');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {GYM_FIELDS.map(({ id, label, placeholder }) => (
        <div key={id} className="space-y-1.5">
          <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">{label}</label>
          <Input id={id} name={id} defaultValue={fieldValues[id] ?? ''} placeholder={placeholder} className="bg-card border-foreground/10 text-foreground" />
        </div>
      ))}
      <div className="space-y-1.5">
        <label htmlFor="gymDescription" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Description</label>
        <Textarea id="gymDescription" name="gymDescription" defaultValue={gymInfo?.description ?? ''} rows={3} className="bg-card border-foreground/10 text-foreground" />
      </div>
      <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex justify-end">
        <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving...' : 'Save Gym Info'}
        </Button>
      </div>
    </form>
  );
}
