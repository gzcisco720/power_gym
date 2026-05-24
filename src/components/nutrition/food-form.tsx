'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { IFood, IFoodMacros, IFoodServing } from '@/lib/db/models/food.model';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ServingRow {
  label: string;
  grams: string;
}

interface InitialFood {
  _id: string;
  name: string;
  brand: string | null;
  macrosPer100g: IFoodMacros;
  servings: IFoodServing[];
}

export interface FoodFormProps {
  /** 'create' shows POST /api/foods; 'edit' shows PATCH /api/foods/:id and pre-fills fields. */
  mode?: 'create' | 'edit';
  /** Required when mode='edit'. */
  initialFood?: InitialFood;
  /** Called after a successful save. Receives the saved food document. */
  onSaved: (food: IFood) => void;
  /** Called when user clicks Cancel. */
  onCancel: () => void;
  /** When true, the action footer sticks to the viewport bottom. Set on full-page hosts. */
  stickyFooter?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPTIONAL_MICROS: { key: keyof IFoodMacros; label: string }[] = [
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

const SECTION_LABEL =
  'text-[11px] font-semibold uppercase tracking-wider text-foreground/65';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function macroToString(v: number | undefined): string {
  if (v === undefined || v === null || Number.isNaN(v)) return '';
  return String(v);
}

function initialServings(food?: InitialFood): ServingRow[] {
  if (food && food.servings.length > 0) {
    return food.servings.map((s) => ({ label: s.label, grams: String(s.grams) }));
  }
  return [{ label: '100 g', grams: '100' }];
}

function initialMicros(food?: InitialFood): Record<string, string> {
  if (!food) return {};
  const out: Record<string, string> = {};
  for (const { key } of OPTIONAL_MICROS) {
    const v = food.macrosPer100g[key];
    if (typeof v === 'number') out[key] = String(v);
  }
  return out;
}

function someMicroFilled(micros: Record<string, string>): boolean {
  return OPTIONAL_MICROS.some(({ key }) => {
    const v = micros[key];
    return v !== undefined && v.trim() !== '';
  });
}

// ---------------------------------------------------------------------------
// FoodForm
// ---------------------------------------------------------------------------

export function FoodForm({
  mode = 'create',
  initialFood,
  onSaved,
  onCancel,
  stickyFooter = false,
}: FoodFormProps) {
  const [name, setName] = useState(initialFood?.name ?? '');
  const [brand, setBrand] = useState(initialFood?.brand ?? '');
  const [kcal, setKcal] = useState(macroToString(initialFood?.macrosPer100g.kcal));
  const [protein, setProtein] = useState(macroToString(initialFood?.macrosPer100g.protein));
  const [carbs, setCarbs] = useState(macroToString(initialFood?.macrosPer100g.carbs));
  const [fat, setFat] = useState(macroToString(initialFood?.macrosPer100g.fat));
  const [micros, setMicros] = useState<Record<string, string>>(() => initialMicros(initialFood));
  const [servings, setServings] = useState<ServingRow[]>(() => initialServings(initialFood));
  const [showMicros, setShowMicros] = useState<boolean>(() => someMicroFilled(initialMicros(initialFood)));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(false);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: initialFood?.name ?? '',
        brand: initialFood?.brand ?? '',
        kcal: macroToString(initialFood?.macrosPer100g.kcal),
        protein: macroToString(initialFood?.macrosPer100g.protein),
        carbs: macroToString(initialFood?.macrosPer100g.carbs),
        fat: macroToString(initialFood?.macrosPer100g.fat),
        micros: initialMicros(initialFood),
        servings: initialServings(initialFood),
      }),
    [initialFood],
  );
  const isDirty = useMemo(
    () =>
      JSON.stringify({ name, brand, kcal, protein, carbs, fat, micros, servings }) !==
      initialSnapshot,
    [name, brand, kcal, protein, carbs, fat, micros, servings, initialSnapshot],
  );

  // Warn before browser-level navigation when there are unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    function handle(e: BeforeUnloadEvent): void {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isDirty]);

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

  function handleCancelClick(): void {
    if (isDirty) {
      setPendingCancel(true);
      return;
    }
    onCancel();
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
      const url = mode === 'edit' && initialFood ? `/api/foods/${initialFood._id}` : '/api/foods';
      const method = mode === 'edit' ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        const msg = data.error ?? `Failed to ${mode === 'edit' ? 'save' : 'create'} food.`;
        setError(msg);
        toast.error(msg);
        return;
      }
      const { food } = (await res.json()) as { food: IFood };
      toast.success(mode === 'edit' ? 'Food saved' : 'Food created');
      onSaved(food);
    } catch {
      const msg = 'Network error. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = mode === 'edit' ? 'Save Changes' : 'Create Food';
  const submittingLabel = mode === 'edit' ? 'Saving…' : 'Creating…';

  const footerClass = stickyFooter
    ? 'sticky bottom-0 z-10 flex items-center justify-end gap-2 py-2 backdrop-blur-md bg-background/50'
    : 'flex items-center justify-end gap-2 pt-2';

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={stickyFooter ? 'space-y-4 pb-4' : 'space-y-4'}
        noValidate
      >
        {/* Basic info */}
        <Card className="p-4 space-y-4">
          <div className={SECTION_LABEL}>Basic Info</div>

          <div className="space-y-1.5">
            <Label htmlFor="food-name" className="text-xs text-foreground/80">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="food-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken Breast"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="food-brand" className="text-xs text-foreground/80">
              Brand <span className="text-foreground/65">(optional)</span>
            </Label>
            <Input
              id="food-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Generic"
            />
          </div>
        </Card>

        {/* Per-100g macros */}
        <Card className="p-4 space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className={SECTION_LABEL}>Core Macros</div>
            <span className="text-xs text-foreground/65">per 100 g</span>
          </div>
          <p className="text-xs text-foreground/65 -mt-2">
            Always entered per 100 g — servings below let members log by portion.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: 'kcal', label: 'Energy (kcal)', val: kcal, set: setKcal, placeholder: '0' },
                { key: 'protein', label: 'Protein (g)', val: protein, set: setProtein, placeholder: '0' },
                { key: 'carbs', label: 'Carbs (g)', val: carbs, set: setCarbs, placeholder: '0' },
                { key: 'fat', label: 'Fat (g)', val: fat, set: setFat, placeholder: '0' },
              ] as const
            ).map(({ key, label, val, set, placeholder }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`macro-${key}`} className="text-xs text-foreground/80">
                  {label} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`macro-${key}`}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  required
                  className="tabular-nums"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Servings — promoted above optional micros */}
        <Card className="p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <div className={SECTION_LABEL}>Servings</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addServing}
              className="h-7 text-xs text-foreground/65 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Serving
            </Button>
          </div>
          <p className="text-xs text-foreground/65 -mt-1">
            Label (e.g. &ldquo;1 cup&rdquo;) plus its weight in grams. At least one required.
          </p>

          <div className="space-y-2">
            {servings.map((s, idx) => (
              <div key={`serving-${idx}`} className="flex items-center gap-2">
                <Input
                  value={s.label}
                  onChange={(e) => updateServing(idx, 'label', e.target.value)}
                  placeholder="e.g. 1 cup"
                  className="flex-1"
                  aria-label={`Serving ${idx + 1} label`}
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={s.grams}
                  onChange={(e) => updateServing(idx, 'grams', e.target.value)}
                  placeholder="g"
                  className="w-24 tabular-nums"
                  aria-label={`Serving ${idx + 1} grams`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeServing(idx)}
                  disabled={servings.length === 1}
                  className="shrink-0 text-foreground/65 hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                  aria-label={`Remove serving ${idx + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Per-100g optional micros — collapsible */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMicros((v) => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-expanded={showMicros}
          >
            <div className="flex items-center gap-2">
              {showMicros ? (
                <ChevronDown className="h-4 w-4 text-foreground/65" />
              ) : (
                <ChevronRight className="h-4 w-4 text-foreground/65" />
              )}
              <span className={SECTION_LABEL}>Optional Micros</span>
              {!showMicros && someMicroFilled(micros) && (
                <span className="text-xs text-foreground/65">
                  · {OPTIONAL_MICROS.filter((m) => micros[m.key]?.trim()).length} set
                </span>
              )}
            </div>
            <span className="text-xs text-foreground/65">per 100 g</span>
          </button>
          {showMicros && (
            <div className="grid grid-cols-2 gap-3 px-4 pb-4 -mt-1">
              {OPTIONAL_MICROS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`micro-${key}`} className="text-xs text-foreground/80">
                    {label}
                  </Label>
                  <Input
                    id={`micro-${key}`}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={micros[key] ?? ''}
                    onChange={(e) => setMicro(key, e.target.value)}
                    placeholder="—"
                    className="tabular-nums"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className={footerClass}>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelClick}
            disabled={submitting}
            className="border-foreground/20 hover:border-foreground/40 hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || (mode === 'edit' && !isDirty)}
            className="bg-white text-black hover:bg-white/90 font-semibold"
          >
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </form>

      {/* Discard confirmation */}
      <Dialog
        open={pendingCancel}
        onOpenChange={(o) => {
          if (!o) setPendingCancel(false);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/65">
            You have unsaved changes. Leaving will discard them.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingCancel(false)}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setPendingCancel(false);
                onCancel();
              }}
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

