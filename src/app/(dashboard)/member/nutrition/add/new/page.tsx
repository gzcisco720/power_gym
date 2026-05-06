'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { calculateMacros } from '@/lib/nutrition/macros';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';

interface DailyLogPayload {
  memberId: string;
  planId: string;
  date: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
}

type NumericKey =
  | 'kcal'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'fiber'
  | 'polyunsaturated'
  | 'sugar'
  | 'monounsaturated'
  | 'polyols'
  | 'saturated'
  | 'salt'
  | 'cholesterol'
  | 'sodium';

// Left column / right column pairs (null = empty cell)
const FIELD_PAIRS: [NumericKey, string, NumericKey | null, string][] = [
  ['kcal', 'Kcal', 'protein', 'Protein'],
  ['carbs', 'Carbs', 'fat', 'Fat'],
  ['fiber', 'Fiber', 'polyunsaturated', 'Polyunsaturated'],
  ['sugar', 'Sugar', 'monounsaturated', 'Monounsaturated'],
  ['polyols', 'Polyols', 'saturated', 'Saturated'],
  ['salt', 'Salt', null, ''],
  ['cholesterol', 'Cholesterol (mg)', 'sodium', 'Sodium (mg)'],
];

const INITIAL_VALS: Record<NumericKey, number> = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  polyunsaturated: 0,
  sugar: 0,
  monounsaturated: 0,
  polyols: 0,
  saturated: 0,
  salt: 0,
  cholesterol: 0,
  sodium: 0,
};

export default function MemberCreateFoodPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status } = useSession();

  const date = params.get('date') ?? new Date().toISOString().slice(0, 10);
  const mealIndex = Number(params.get('mealIndex') ?? '0');

  const [name, setName] = useState('');
  const [vals, setVals] = useState<Record<NumericKey, number>>(INITIAL_VALS);
  const [servingSize, setServingSize] = useState(100);
  const [amount, setAmount] = useState(100);
  const [submitting, setSubmitting] = useState(false);

  const previewMacros = useMemo(() => {
    return calculateMacros(
      {
        per100g: null,
        perServing: {
          kcal: vals.kcal,
          protein: vals.protein,
          carbs: vals.carbs,
          fat: vals.fat,
          fiber: vals.fiber,
          sugar: vals.sugar,
          salt: vals.salt,
          saturated: vals.saturated,
          polyunsaturated: vals.polyunsaturated,
          monounsaturated: vals.monounsaturated,
          polyols: vals.polyols,
          cholesterol: vals.cholesterol,
          sodium: vals.sodium,
          servingLabel: 'serving',
          grams: servingSize > 0 ? servingSize : 1,
        },
      },
      amount,
    );
  }, [vals, servingSize, amount]);

  if (status === 'loading') return <div className="p-6">Loading…</div>;
  if (!session?.user?.id) return null;

  const memberId = session.user.id;

  function handleValChange(key: NumericKey, raw: string): void {
    setVals((prev) => ({ ...prev, [key]: Number(raw) || 0 }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/members/${memberId}/nutrition/log/${date}`);
    if (!res.ok) {
      setSubmitting(false);
      return;
    }
    const log = (await res.json()) as DailyLogPayload;
    const idx =
      Number.isFinite(mealIndex) && mealIndex >= 0 && mealIndex < log.meals.length
        ? mealIndex
        : 0;

    log.meals[idx].items.push({
      foodName: name.trim(),
      quantityG: amount,
      ...previewMacros,
    });

    await fetch(`/api/members/${memberId}/nutrition/log/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayTypeName: log.dayTypeName,
        meals: log.meals,
        dayCompleted: log.dayCompleted,
      }),
    });

    router.push('/member/nutrition');
  }

  return (
    <div className="container mx-auto py-4 max-w-3xl space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.back()}>
          Back
        </Button>
        <h1 className="text-lg font-semibold">Create Food Entry</h1>
        <span className="w-16" />
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <Label htmlFor="food-name">Name</Label>
          <Input
            id="food-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Food name"
            required
            className="w-full"
          />
        </div>

        {/* Numeric macro grid */}
        <div className="grid grid-cols-2 gap-3">
          {FIELD_PAIRS.map(([leftKey, leftLabel, rightKey, rightLabel]) => (
            <Fragment key={leftKey}>
              <div className="space-y-1">
                <Label htmlFor={`field-${leftKey}`}>{leftLabel}</Label>
                <Input
                  id={`field-${leftKey}`}
                  type="number"
                  min={0}
                  step="any"
                  value={vals[leftKey]}
                  onChange={(e) => handleValChange(leftKey, e.target.value)}
                />
              </div>
              {rightKey !== null ? (
                <div className="space-y-1">
                  <Label htmlFor={`field-${rightKey}`}>{rightLabel}</Label>
                  <Input
                    id={`field-${rightKey}`}
                    type="number"
                    min={0}
                    step="any"
                    value={vals[rightKey]}
                    onChange={(e) => handleValChange(rightKey, e.target.value)}
                  />
                </div>
              ) : (
                <div />
              )}
            </Fragment>
          ))}
        </div>

        {/* Serving Size + Amount */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="serving-size">Serving size (g)</Label>
            <Input
              id="serving-size"
              type="number"
              min={1}
              step="any"
              value={servingSize}
              onChange={(e) => {
                const v = Number(e.target.value) || 1;
                setServingSize(v);
                setAmount(v);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="amount">Amount (g)</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Preview ({amount}g)</p>
          <p>
            {previewMacros.kcal.toFixed(0)} kcal &middot; {previewMacros.protein.toFixed(1)}g
            protein &middot; {previewMacros.carbs.toFixed(1)}g carbs &middot;{' '}
            {previewMacros.fat.toFixed(1)}g fat
          </p>
          {(previewMacros.fiber != null ||
            previewMacros.sugar != null ||
            previewMacros.saturated != null) && (
            <p>
              {previewMacros.fiber != null && `Fiber ${previewMacros.fiber.toFixed(1)}g`}
              {previewMacros.sugar != null && ` · Sugar ${previewMacros.sugar.toFixed(1)}g`}
              {previewMacros.saturated != null &&
                ` · Saturated ${previewMacros.saturated.toFixed(1)}g`}
            </p>
          )}
        </div>

        <Button type="submit" disabled={!name.trim() || submitting} className="w-full">
          {submitting ? 'Adding…' : 'Add to Diary'}
        </Button>
      </form>
    </div>
  );
}
