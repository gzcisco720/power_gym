'use client';
import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Loader2Icon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FoodPicker } from '@/components/nutrition/food-picker';
import { computePickedFood } from '@/components/nutrition/food-picker.utils';
import { FoodForm } from '@/components/nutrition/food-form';
import { calculateMacros } from '@/lib/nutrition/macros';
import { cn } from '@/lib/utils';
import type { FoodEntry, FoodServing, PickedFood } from '@/components/nutrition/food-picker.types';
import type { IFood } from '@/lib/db/models/food.model';
import type { FatSecretFood } from '@/lib/nutrition/fatsecret-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FoodPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = trainer/template context — hides the Recent tab */
  memberId: string | null;
  onSelect: (item: PickedFood) => void;
  onCreateNewHref?: string;
}

type DialogView = 'list' | 'detail' | 'create';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ifoodToEntry(food: IFood): FoodEntry {
  return {
    source: 'myfood',
    name: food.name,
    brand: food.brand,
    servings: food.servings.map((s, i) => {
      const macros = calculateMacros({ per100g: food.macrosPer100g, perServing: null }, s.grams);
      return {
        id: String(i),
        label: s.label,
        grams: s.grams,
        macros: {
          kcal: macros.kcal,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat,
          fiber: macros.fiber,
          sugar: macros.sugar,
          salt: macros.salt,
          saturated: macros.saturated,
          polyunsaturated: macros.polyunsaturated,
          monounsaturated: macros.monounsaturated,
          polyols: macros.polyols,
          cholesterol: macros.cholesterol,
          sodium: macros.sodium,
          potassium: macros.potassium,
          transFat: macros.transFat,
        },
      };
    }),
    defaultServingId: '0',
  };
}

function fatSecretFoodToServings(food: FatSecretFood): FoodServing[] {
  return food.servings.map((s) => ({
    id: s.servingId,
    label: s.description,
    grams: s.grams,
    macros: {
      kcal: s.calories,
      protein: s.protein,
      carbs: s.carbs,
      fat: s.fat,
      fiber: s.fiber,
      sugar: s.sugar,
      saturated: s.saturated,
      polyunsaturated: s.polyunsaturated,
      monounsaturated: s.monounsaturated,
      cholesterol: s.cholesterol,
      sodium: s.sodium,
      potassium: s.potassium,
      transFat: s.transFat,
    },
  }));
}

// ---------------------------------------------------------------------------
// Nutrient row in the details panel
// ---------------------------------------------------------------------------

function NutrientRow({ label, value, indent }: { label: string; value: string; indent?: boolean }) {
  return (
    <div className={cn('flex justify-between px-3 py-1.5', indent && 'pl-6')}>
      <span className="text-foreground/65 text-sm">{label}</span>
      <span className="tabular-nums text-sm font-medium">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail view
// ---------------------------------------------------------------------------

interface DetailViewProps {
  entry: FoodEntry;
  onBack: () => void;
  onAdd: (picked: PickedFood) => void;
}

function DetailView({ entry, onBack, onAdd }: DetailViewProps) {
  // oxlint-disable-next-line react-doctor/no-derived-useState
  const [servings, setServings] = useState<FoodServing[]>(entry.servings);
  // oxlint-disable-next-line react-doctor/no-derived-useState
  const [servingId, setServingId] = useState(entry.defaultServingId);
  const [qty, setQty] = useState('1');
  const [loading, setLoading] = useState(entry.source === 'fatsecret' && !!entry.foodId);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imgFailed, setImgFailed] = useState(false);

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    if (entry.source !== 'fatsecret' || !entry.foodId) return;
    const controller = new AbortController();
    fetch(`/api/food/${entry.foodId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const { food } = (await res.json()) as { food: FatSecretFood };
        if (!food) return;
        setServings(fatSecretFoodToServings(food));
        setServingId(food.defaultServing.servingId);
        if (food.imageUrl) setImageUrl(food.imageUrl);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') setLoading(false);
      });
    return () => controller.abort();
  }, [entry.foodId, entry.source]);

  const qtyNum = parseFloat(qty) || 0;
  const currentServing = servings.find((s) => s.id === servingId) ?? servings[0];

  const scaled =
    currentServing && qtyNum > 0
      ? {
          kcal: currentServing.macros.kcal * qtyNum,
          protein: currentServing.macros.protein * qtyNum,
          carbs: currentServing.macros.carbs * qtyNum,
          fat: currentServing.macros.fat * qtyNum,
          fiber: currentServing.macros.fiber !== undefined ? currentServing.macros.fiber * qtyNum : undefined,
          sugar: currentServing.macros.sugar !== undefined ? currentServing.macros.sugar * qtyNum : undefined,
          saturated: currentServing.macros.saturated !== undefined ? currentServing.macros.saturated * qtyNum : undefined,
          transFat: currentServing.macros.transFat !== undefined ? currentServing.macros.transFat * qtyNum : undefined,
          polyunsaturated: currentServing.macros.polyunsaturated !== undefined ? currentServing.macros.polyunsaturated * qtyNum : undefined,
          monounsaturated: currentServing.macros.monounsaturated !== undefined ? currentServing.macros.monounsaturated * qtyNum : undefined,
          cholesterol: currentServing.macros.cholesterol !== undefined ? currentServing.macros.cholesterol * qtyNum : undefined,
          sodium: currentServing.macros.sodium !== undefined ? currentServing.macros.sodium * qtyNum : undefined,
          potassium: currentServing.macros.potassium !== undefined ? currentServing.macros.potassium * qtyNum : undefined,
        }
      : null;

  const hasDetails =
    currentServing &&
    (currentServing.macros.fiber !== undefined ||
      currentServing.macros.sugar !== undefined ||
      currentServing.macros.saturated !== undefined ||
      currentServing.macros.transFat !== undefined ||
      currentServing.macros.cholesterol !== undefined ||
      currentServing.macros.sodium !== undefined ||
      currentServing.macros.potassium !== undefined);

  function handleAdd(): void {
    if (!currentServing || qtyNum <= 0) return;
    const snapshot: FoodEntry = { ...entry, servings, defaultServingId: servings[0]?.id ?? '' };
    const picked = computePickedFood(snapshot, servingId, qtyNum);
    onAdd(picked);
  }

  return (
    <div className="space-y-4">
      {/* Header: food name on left, image on right */}
      <div className="flex items-start gap-3 justify-between">
        <div className="flex-1 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="px-2 -ml-2 mb-0.5">
            ← Back
          </Button>
          {entry.brand && (
            <p className="text-xs text-foreground/65 leading-none mb-0.5">{entry.brand}</p>
          )}
          <h2 className="font-semibold text-base leading-snug">{entry.name}</h2>
        </div>
        {imageUrl && !imgFailed && (
          <Image
            src={imageUrl}
            alt={entry.name}
            width={80}
            height={80}
            className="rounded-xl object-cover shrink-0 ring-1 ring-foreground/10"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2Icon className="size-5 animate-spin text-foreground/65" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Serving chips */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground/65">Serving</p>
            <div className="flex flex-wrap gap-1.5">
              {servings.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServingId(s.id)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    s.id === servingId
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-muted text-foreground/65 hover:border-foreground/30 hover:text-foreground',
                  )}
                >
                  {s.label} · {s.grams}g
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <label htmlFor="food-picker-qty" className="text-xs font-medium text-foreground/65">Quantity</label>
            <Input
              id="food-picker-qty"
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              aria-label="Quantity"
            />
          </div>

          {/* Hero macro block */}
          {scaled && (
            <div className="rounded-xl bg-muted/40 px-4 py-5 text-center space-y-3">
              {/* Big calorie number */}
              <div>
                <div className="text-5xl font-bold tabular-nums leading-none">{scaled.kcal.toFixed(0)}</div>
                <div className="text-xs text-foreground/65 mt-1.5">Calories</div>
              </div>
              {/* Macro pills */}
              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex items-baseline gap-0.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-emerald-300">
                  {scaled.protein.toFixed(1)}
                  <span className="text-[11px] font-normal opacity-80">g P</span>
                </span>
                <span className="inline-flex items-baseline gap-0.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-amber-300">
                  {scaled.carbs.toFixed(1)}
                  <span className="text-[11px] font-normal opacity-80">g C</span>
                </span>
                <span className="inline-flex items-baseline gap-0.5 rounded-lg bg-pink-500/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-pink-300">
                  {scaled.fat.toFixed(1)}
                  <span className="text-[11px] font-normal opacity-80">g F</span>
                </span>
              </div>
            </div>
          )}

          {/* Nutrition details panel */}
          {scaled && hasDetails && (
            <div className="rounded-xl border overflow-hidden">
              <div className="px-3 py-2 bg-muted/30 border-b">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                  Nutrition Details
                </p>
              </div>
              <div className="divide-y">
                {scaled.fiber !== undefined && (
                  <NutrientRow label="Dietary Fiber" value={`${scaled.fiber.toFixed(1)}g`} />
                )}
                {scaled.sugar !== undefined && (
                  <NutrientRow label="Total Sugars" value={`${scaled.sugar.toFixed(1)}g`} indent />
                )}
                {scaled.saturated !== undefined && (
                  <NutrientRow label="Saturated Fat" value={`${scaled.saturated.toFixed(1)}g`} indent />
                )}
                {scaled.transFat !== undefined && (
                  <NutrientRow label="Trans Fat" value={`${scaled.transFat.toFixed(1)}g`} indent />
                )}
                {scaled.polyunsaturated !== undefined && (
                  <NutrientRow label="Polyunsaturated Fat" value={`${scaled.polyunsaturated.toFixed(1)}g`} indent />
                )}
                {scaled.monounsaturated !== undefined && (
                  <NutrientRow label="Monounsaturated Fat" value={`${scaled.monounsaturated.toFixed(1)}g`} indent />
                )}
                {scaled.cholesterol !== undefined && (
                  <NutrientRow label="Cholesterol" value={`${scaled.cholesterol.toFixed(0)}mg`} />
                )}
                {scaled.sodium !== undefined && (
                  <NutrientRow label="Sodium" value={`${scaled.sodium.toFixed(0)}mg`} />
                )}
                {scaled.potassium !== undefined && (
                  <NutrientRow label="Potassium" value={`${scaled.potassium.toFixed(0)}mg`} />
                )}
              </div>
            </div>
          )}

          <Button className="w-full" onClick={handleAdd} disabled={!scaled || qtyNum <= 0}>
            + Add to meal
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FoodPickerDialog — public component
// ---------------------------------------------------------------------------

export function FoodPickerDialog({
  open,
  onOpenChange,
  memberId,
  onSelect,
  onCreateNewHref,
}: FoodPickerDialogProps) {
  const [view, setView] = useState<DialogView>('list');
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setView('list');
        setSelectedEntry(null);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange],
  );

  const handleSelectFood = useCallback((entry: FoodEntry) => {
    setSelectedEntry(entry);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setView('list');
    setSelectedEntry(null);
  }, []);

  const handleAdd = useCallback(
    (picked: PickedFood) => {
      onSelect(picked);
      onOpenChange(false);
      setView('list');
      setSelectedEntry(null);
    },
    [onSelect, onOpenChange],
  );

  const handleCreated = useCallback((food: IFood) => {
    const entry = ifoodToEntry(food);
    setSelectedEntry(entry);
    setView('detail');
  }, []);

  const handleCreateNew = useCallback(() => {
    setView('create');
  }, []);

  const handleCancelCreate = useCallback(() => {
    setView('list');
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" showCloseButton={view === 'list'}>
        {view === 'list' && (
          <>
            <DialogHeader>
              <DialogTitle>Add Food</DialogTitle>
            </DialogHeader>
            <FoodPicker
              memberId={memberId}
              onSelectFood={handleSelectFood}
              onCreateNew={handleCreateNew}
              onCreateNewHref={onCreateNewHref}
            />
          </>
        )}
        {view === 'detail' && selectedEntry && (
          <DetailView
            key={selectedEntry.foodId ?? selectedEntry.name}
            entry={selectedEntry}
            onBack={handleBack}
            onAdd={handleAdd}
          />
        )}
        {view === 'create' && (
          <>
            <DialogHeader>
              <DialogTitle>Create Food</DialogTitle>
            </DialogHeader>
            <FoodForm
              mode="create"
              onSaved={handleCreated}
              onCancel={handleCancelCreate}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
