'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { IFood } from '@/lib/db/models/food.model';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServingRow {
  label: string;
  grams: string;
}

export interface FoodCreateFormProps {
  /** Called after successful POST /api/foods. Receives the created food document. */
  onCreated: (food: IFood) => void;
  /** Called when user clicks Cancel. */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPTIONAL_MICROS: { key: string; label: string }[] = [
  { key: 'fiber', label: 'Fiber (g)' },
  { key: 'sugar', label: 'Sugar (g)' },
  { key: 'salt', label: 'Salt (g)' },
  { key: 'saturated', label: 'Saturated fat (g)' },
  { key: 'polyunsaturated', label: 'Polyunsaturated fat (g)' },
  { key: 'monounsaturated', label: 'Monounsaturated fat (g)' },
  { key: 'polyols', label: 'Polyols (g)' },
  { key: 'cholesterol', label: 'Cholesterol (mg)' },
  { key: 'sodium', label: 'Sodium (mg)' },
  { key: 'potassium', label: 'Potassium (mg)' },
  { key: 'transFat', label: 'Trans fat (g)' },
];

const INPUT_CLASS =
  'bg-[#0c0c0c] border-[#222] text-white placeholder:text-[#555] focus-visible:ring-0 focus-visible:border-[#444]';

// ---------------------------------------------------------------------------
// FoodCreateForm
// ---------------------------------------------------------------------------

export function FoodCreateForm({ onCreated, onCancel }: FoodCreateFormProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [micros, setMicros] = useState<Record<string, string>>({});
  const [servings, setServings] = useState<ServingRow[]>([{ label: '100 g', grams: '100' }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setMicro(key: string, value: string): void {
    setMicros((prev) => ({ ...prev, [key]: value }));
  }

  function addServing(): void {
    setServings((prev) => [...prev, { label: '', grams: '' }]);
  }

  function updateServing(idx: number, field: 'label' | 'grams', value: string): void {
    setServings((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function removeServing(idx: number): void {
    setServings((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const parsedKcal = parseFloat(kcal);
    const parsedProtein = parseFloat(protein);
    const parsedCarbs = parseFloat(carbs);
    const parsedFat = parseFloat(fat);
    if ([parsedKcal, parsedProtein, parsedCarbs, parsedFat].some(isNaN)) {
      setError('All four per-100g macros (kcal, protein, carbs, fat) are required.');
      return;
    }
    const validServings = servings.filter((s) => s.label.trim() && s.grams.trim());
    if (validServings.length === 0) {
      setError('At least one valid serving is required.');
      return;
    }
    const parsedServings = validServings.map((s) => ({
      label: s.label.trim(),
      grams: parseFloat(s.grams),
    }));
    if (parsedServings.some((s) => isNaN(s.grams) || s.grams <= 0)) {
      setError('Each serving must have a positive number of grams.');
      return;
    }

    const macrosPer100g: Record<string, number> = {
      kcal: parsedKcal,
      protein: parsedProtein,
      carbs: parsedCarbs,
      fat: parsedFat,
    };
    for (const { key } of OPTIONAL_MICROS) {
      const val = micros[key];
      if (val && val.trim() !== '') {
        const n = parseFloat(val);
        if (!isNaN(n)) macrosPer100g[key] = n;
      }
    }

    const body = {
      name: name.trim(),
      brand: brand.trim() || null,
      macrosPer100g,
      servings: parsedServings,
    };

    setSubmitting(true);
    try {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to create food.');
        return;
      }
      const { food } = (await res.json()) as { food: IFood };
      onCreated(food);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-5 space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#555]">Basic Info</div>

        <div className="space-y-1.5">
          <Label className="text-[13px] text-[#aaa]">Name *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chicken Breast"
            className={INPUT_CLASS}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[13px] text-[#aaa]">Brand (optional)</Label>
          <Input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Generic"
            className={INPUT_CLASS}
          />
        </div>
      </Card>

      {/* Per-100g macros */}
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-5 space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#555]">Per 100g — Core Macros</div>

        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { key: 'kcal', label: 'Energy (kcal)', val: kcal, set: setKcal },
              { key: 'protein', label: 'Protein (g)', val: protein, set: setProtein },
              { key: 'carbs', label: 'Carbs (g)', val: carbs, set: setCarbs },
              { key: 'fat', label: 'Fat (g)', val: fat, set: setFat },
            ] as const
          ).map(({ key, label, val, set }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-[13px] text-[#aaa]">{label} *</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder="0"
                className={INPUT_CLASS}
                required
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Per-100g optional micros */}
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-5 space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#555]">Per 100g — Optional Micros</div>

        <div className="grid grid-cols-2 gap-3">
          {OPTIONAL_MICROS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-[13px] text-[#aaa]">{label}</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={micros[key] ?? ''}
                onChange={(e) => setMicro(key, e.target.value)}
                placeholder="—"
                className={INPUT_CLASS}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Servings */}
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[2px] text-[#555]">Servings</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addServing}
            className="h-7 text-[12px] text-[#888] hover:text-white hover:bg-[#141414]"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Serving
          </Button>
        </div>

        <div className="space-y-2">
          {servings.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={s.label}
                onChange={(e) => updateServing(idx, 'label', e.target.value)}
                placeholder="e.g. 1 cup"
                className={`flex-1 ${INPUT_CLASS}`}
              />
              <Input
                type="number"
                min="0.1"
                step="any"
                value={s.grams}
                onChange={(e) => updateServing(idx, 'grams', e.target.value)}
                placeholder="g"
                className={`w-24 ${INPUT_CLASS}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeServing(idx)}
                disabled={servings.length === 1}
                className="shrink-0 text-[#777] hover:text-red-400 hover:bg-[#141414] disabled:opacity-30"
                aria-label="Remove serving"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-[#555]">
          Label (e.g. &ldquo;1 cup&rdquo;) &nbsp;+&nbsp; weight in grams. At least one required.
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-[13px] text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-white text-black hover:bg-white/90 font-semibold"
        >
          {submitting ? 'Saving…' : 'Create Food'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="text-[#888] hover:text-white hover:bg-[#141414]"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
