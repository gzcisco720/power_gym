'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FoodAddSheet, type AddedMealItem } from '@/components/nutrition/food-add-sheet';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

interface FormData {
  name: string;
  description: string | null;
  dayTypes: IDayType[];
}

interface Props {
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
}

export function NutritionTemplateForm({ initialData, onSubmit }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [dayTypes, setDayTypes] = useState<IDayType[]>(initialData?.dayTypes ?? []);

  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [draftDay, setDraftDay] = useState<IDayType | null>(null);
  const [addingFood, setAddingFood] = useState<{ dayIdx: number; mealIdx: number } | null>(null);

  function openNewDayDialog(): void {
    setDraftDay({ name: '', targetKcal: 0, targetProtein: 0, targetCarbs: 0, targetFat: 0, meals: [] });
    setEditingDayIdx(dayTypes.length);
  }

  function openEditDay(idx: number): void {
    setDraftDay(structuredClone(dayTypes[idx]) as IDayType);
    setEditingDayIdx(idx);
  }

  function saveDayDraft(): void {
    if (editingDayIdx === null || !draftDay) return;
    setDayTypes((d) => {
      const next = [...d];
      next[editingDayIdx] = draftDay;
      return next;
    });
    setDraftDay(null);
    setEditingDayIdx(null);
  }

  function deleteDay(idx: number): void {
    setDayTypes((d) => d.filter((_, i) => i !== idx));
  }

  function addMealToDraft(): void {
    if (!draftDay) return;
    setDraftDay({ ...draftDay, meals: [...draftDay.meals, { name: 'Meal', order: draftDay.meals.length + 1, items: [] }] });
  }

  function addFoodToMeal(item: AddedMealItem): void {
    if (!addingFood || !draftDay) return;
    const meals = draftDay.meals.map((m, i) => i === addingFood.mealIdx
      ? { ...m, items: [...m.items, item] }
      : m,
    );
    setDraftDay({ ...draftDay, meals });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit({ name, description: description || null, dayTypes });
      }}
    >
      <Card className="p-3 space-y-2">
        <Label htmlFor="tpl-name">Template Name</Label>
        <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Label htmlFor="tpl-desc">Description</Label>
        <Textarea id="tpl-desc" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
      </Card>

      <Card className="p-3 space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium">Day Types</h3>
          <Button type="button" size="sm" onClick={openNewDayDialog}>+ Day Type</Button>
        </div>
        <ul className="divide-y text-sm">
          {dayTypes.map((d, idx) => (
            <li key={`${d.name}-${idx}`} className="py-1.5 flex justify-between items-center">
              <span>{d.name} <span className="text-muted-foreground">{d.targetKcal} kcal · {d.meals.length} meals</span></span>
              <span className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => openEditDay(idx)}>Edit</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => deleteDay(idx)}>Delete</Button>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Button type="submit">Save Template</Button>

      <Dialog open={editingDayIdx !== null} onOpenChange={(o) => { if (!o) { setDraftDay(null); setEditingDayIdx(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draftDay?.name || 'New Day Type'}</DialogTitle>
          </DialogHeader>
          {draftDay && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Name</Label><Input value={draftDay.name} onChange={(e) => setDraftDay({ ...draftDay, name: e.target.value })} /></div>
                <div><Label>Target Kcal</Label><Input type="number" value={draftDay.targetKcal} onChange={(e) => setDraftDay({ ...draftDay, targetKcal: Number(e.target.value) || 0 })} /></div>
                <div><Label>Target Protein (g)</Label><Input type="number" value={draftDay.targetProtein} onChange={(e) => setDraftDay({ ...draftDay, targetProtein: Number(e.target.value) || 0 })} /></div>
                <div><Label>Target Carbs (g)</Label><Input type="number" value={draftDay.targetCarbs} onChange={(e) => setDraftDay({ ...draftDay, targetCarbs: Number(e.target.value) || 0 })} /></div>
                <div><Label>Target Fat (g)</Label><Input type="number" value={draftDay.targetFat} onChange={(e) => setDraftDay({ ...draftDay, targetFat: Number(e.target.value) || 0 })} /></div>
              </div>
              <div className="space-y-2">
                {draftDay.meals.map((m, mIdx) => (
                  <Card key={`${m.name}-${mIdx}`} className="p-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <Input
                        value={m.name}
                        className="h-7 w-40"
                        onChange={(e) => {
                          const meals = draftDay.meals.map((mm, j) => j === mIdx ? { ...mm, name: e.target.value } : mm);
                          setDraftDay({ ...draftDay, meals });
                        }}
                      />
                      <Button type="button" size="sm" onClick={() => setAddingFood({ dayIdx: editingDayIdx ?? 0, mealIdx: mIdx })}>+ Food</Button>
                    </div>
                    <ul className="text-xs divide-y">
                      {m.items.map((it, iIdx) => (
                        <li key={`${it.foodName}-${iIdx}`} className="py-0.5 flex justify-between">
                          <span>{it.foodName} ({it.quantityG}g)</span>
                          <span className="text-muted-foreground">{it.kcal.toFixed(0)} · {it.protein.toFixed(1)}P · {it.carbs.toFixed(1)}C · {it.fat.toFixed(1)}F</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addMealToDraft}>+ Meal</Button>
              </div>
              <Button type="button" onClick={saveDayDraft}>Save Day Type</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FoodAddSheet
        open={addingFood !== null}
        onOpenChange={(o) => !o && setAddingFood(null)}
        onAdd={addFoodToMeal}
      />
    </form>
  );
}
