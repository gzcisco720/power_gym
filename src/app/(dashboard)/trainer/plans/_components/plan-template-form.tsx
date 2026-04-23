'use client';

import { useState } from 'react';
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
      <div className="space-y-2">
        <label htmlFor="plan-name" className="text-sm font-medium">计划名称</label>
        <input
          id="plan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="plan-desc" className="text-sm font-medium">描述</label>
        <textarea
          id="plan-desc"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">训练日</h2>
          <button type="button" onClick={addDay} className="text-sm text-primary hover:underline">
            + 添加训练日
          </button>
        </div>
        {days.map((day, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <input
                placeholder={`Day ${i + 1}`}
                value={day.name}
                onChange={(e) => updateDayName(i, e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="button" onClick={() => removeDay(i)} className="text-sm text-destructive">
                删除
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{day.exercises.length} 个动作（编辑后可在此添加动作）</p>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </form>
  );
}
