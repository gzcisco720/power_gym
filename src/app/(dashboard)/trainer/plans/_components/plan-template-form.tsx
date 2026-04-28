'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

interface FormData {
  name: string;
  description: string | null;
  days: IPlanDay[];
}

interface Props {
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
}

export function PlanTemplateForm({ initialData, onSubmit }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [days, setDays] = useState<IPlanDay[]>(initialData?.days ?? []);
  const [saving, setSaving] = useState(false);

  function addDay() {
    const num = days.length + 1;
    setDays([...days, { dayNumber: num, name: `Day ${num}`, exercises: [] }]);
  }

  function updateDayName(index: number, value: string) {
    const updated = [...days];
    updated[index] = { ...updated[index], name: value };
    setDays(updated);
  }

  function removeDay(index: number) {
    setDays(days.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ name, description: description || null, days });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-6 space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="plan-name"
            className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#666]"
          >
            Plan Name
          </label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="plan-desc"
            className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#666]"
          >
            Description
          </label>
          <Textarea
            id="plan-desc"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white resize-none"
          />
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold uppercase tracking-[1.5px] text-[#666]">
            Training Days
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={addDay}
            className="border border-[#1a1a1a] text-[#888] hover:border-[#333] hover:text-[#aaa] text-xs"
          >
            + Add Day
          </Button>
        </div>

        {days.map((day, i) => (
          <Card key={i} className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder={`Day ${i + 1}`}
                value={day.name}
                onChange={(e) => updateDayName(i, e.target.value)}
                className="flex-1 bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeDay(i)}
                className="text-[#777] hover:text-red-400 hover:bg-[#141414] text-xs"
              >
                Delete
              </Button>
            </div>
            <p className="text-xs text-[#777]">{day.exercises.length} exercise{day.exercises.length !== 1 ? 's' : ''}</p>
          </Card>
        ))}
      </div>

      <Button
        type="submit"
        disabled={saving}
        className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
