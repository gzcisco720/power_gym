import { useEffect, useState } from 'react';
import { useNutritionStore } from '@/stores/nutritionStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FoodForm {
  name: string;
  brand: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}

const EMPTY_FORM: FoodForm = { name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '' };

export function TrainerFoodsPage() {
  const { foods, fetchFoods, createFood, isLoading } = useNutritionStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FoodForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetchFoods();
  }, [fetchFoods]);

  function handleChange(field: keyof FoodForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate() {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      await createFood({
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        macrosPer100g: {
          kcal: parseFloat(form.kcal) || 0,
          protein: parseFloat(form.protein) || 0,
          carbs: parseFloat(form.carbs) || 0,
          fat: parseFloat(form.fat) || 0,
        },
        servings: [],
      });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && foods.length === 0) return <div className="p-8 text-foreground/65">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Foods</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>+ New Food</Button>
      </div>

      <div className="space-y-2">
        {foods.map((f) => (
          <div key={f._id} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div>
              <p className="text-sm font-medium text-foreground">{f.name}</p>
              {f.brand && <p className="text-xs text-foreground/65">{f.brand}</p>}
            </div>
            <p className="shrink-0 text-xs text-foreground/65">
              {f.macrosPer100g.kcal} kcal / P{f.macrosPer100g.protein}g C{f.macrosPer100g.carbs}g F{f.macrosPer100g.fat}g
            </p>
          </div>
        ))}
        {foods.length === 0 && (
          <p className="text-sm text-foreground/65">No foods yet.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Food</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="food-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="food-name"
                name="name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="mt-1"
                placeholder="e.g. Chicken Breast"
              />
            </div>
            <div>
              <Label htmlFor="food-brand">Brand <span className="text-foreground/65">(optional)</span></Label>
              <Input
                id="food-brand"
                value={form.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="food-kcal">Calories (kcal)</Label>
                <Input
                  id="food-kcal"
                  name="kcal"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={form.kcal}
                  onChange={(e) => handleChange('kcal', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="food-protein">Protein (g)</Label>
                <Input
                  id="food-protein"
                  name="protein"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={form.protein}
                  onChange={(e) => handleChange('protein', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="food-carbs">Carbs (g)</Label>
                <Input
                  id="food-carbs"
                  name="carbs"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={form.carbs}
                  onChange={(e) => handleChange('carbs', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="food-fat">Fat (g)</Label>
                <Input
                  id="food-fat"
                  name="fat"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={form.fat}
                  onChange={(e) => handleChange('fat', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving || !form.name.trim()}>
              {isSaving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
