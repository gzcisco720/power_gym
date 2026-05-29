import { useEffect, useReducer, useState } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNutritionStore } from '@/stores/nutritionStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { MacroPill } from '@/components/nutrition/macro-pill';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ---------------------------------------------------------------------------
// Create form state
// ---------------------------------------------------------------------------

interface CreateState {
  open: boolean;
  name: string;
  brand: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  submitting: boolean;
  error: string | null;
}

type CreateAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_BRAND'; value: string }
  | { type: 'SET_KCAL'; value: string }
  | { type: 'SET_PROTEIN'; value: string }
  | { type: 'SET_CARBS'; value: string }
  | { type: 'SET_FAT'; value: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_ERROR'; value: string | null };

const INITIAL: CreateState = {
  open: false,
  name: '',
  brand: '',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  submitting: false,
  error: null,
};

function createReducer(state: CreateState, action: CreateAction): CreateState {
  switch (action.type) {
    case 'OPEN': return { ...INITIAL, open: true };
    case 'CLOSE': return { ...INITIAL };
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_BRAND': return { ...state, brand: action.value };
    case 'SET_KCAL': return { ...state, kcal: action.value };
    case 'SET_PROTEIN': return { ...state, protein: action.value };
    case 'SET_CARBS': return { ...state, carbs: action.value };
    case 'SET_FAT': return { ...state, fat: action.value };
    case 'SET_SUBMITTING': return { ...state, submitting: action.value };
    case 'SET_ERROR': return { ...state, error: action.value };
    default: return state;
  }
}

// ---------------------------------------------------------------------------
// TrainerFoodsPage
// ---------------------------------------------------------------------------

export function TrainerFoodsPage() {
  const { foods, fetchFoods, createFood, deleteFood, isLoading } = useNutritionStore();
  const [create, dispatchCreate] = useReducer(createReducer, INITIAL);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    void fetchFoods();
  }, [fetchFoods]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    dispatchCreate({ type: 'SET_ERROR', value: null });

    if (!create.name.trim()) {
      dispatchCreate({ type: 'SET_ERROR', value: 'Name is required.' });
      return;
    }

    const kcal = parseFloat(create.kcal);
    const protein = parseFloat(create.protein);
    const carbs = parseFloat(create.carbs);
    const fat = parseFloat(create.fat);

    if ([kcal, protein, carbs, fat].some(isNaN)) {
      dispatchCreate({ type: 'SET_ERROR', value: 'All four macros (kcal, protein, carbs, fat) are required.' });
      return;
    }

    dispatchCreate({ type: 'SET_SUBMITTING', value: true });
    try {
      await createFood({
        name: create.name.trim(),
        brand: create.brand.trim() || null,
        macrosPer100g: { kcal, protein, carbs, fat },
        servings: [{ label: '100 g', grams: 100 }],
      });
      toast.success('Food created');
      dispatchCreate({ type: 'CLOSE' });
    } catch {
      dispatchCreate({ type: 'SET_ERROR', value: 'Failed to create food.' });
      toast.error('Failed to create food');
    } finally {
      dispatchCreate({ type: 'SET_SUBMITTING', value: false });
    }
  }

  async function handleDeleteConfirm() {
    if (!confirmId) return;
    try {
      await deleteFood(confirmId);
      toast.success('Food deleted');
    } catch {
      toast.error('Failed to delete food');
    } finally {
      setConfirmId(null);
    }
  }

  return (
    <LazyMotion features={domAnimation}>
      <div>
        <PageHeader
          title="Foods"
          subtitle={isLoading ? undefined : `${foods.length} food item${foods.length !== 1 ? 's' : ''}`}
          actions={
            <Button size="sm" onClick={() => dispatchCreate({ type: 'OPEN' })}>
              <Plus className="size-4 mr-1" /> New Food
            </Button>
          }
        />

        <div className="px-4 sm:px-8 py-7">
          {isLoading ? (
            <div className="space-y-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[52px] rounded-xl" />
              ))}
            </div>
          ) : foods.length === 0 ? (
            <EmptyState
              heading="No foods yet"
              description="Add food items to use in nutrition templates."
              action={
                <Button onClick={() => dispatchCreate({ type: 'OPEN' })}>
                  <Plus className="size-4 mr-1" /> New Food
                </Button>
              }
            />
          ) : (
            <m.div
              className="space-y-1.5"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
            >
              {foods.map((food) => (
                <m.div
                  key={food._id}
                  variants={{ hidden: { opacity: 0, y: shouldReduce ? 0 : 6 }, visible: { opacity: 1, y: 0 } }}
                  className="flex items-center gap-3 rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 hover:ring-foreground/25 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{food.name}</p>
                    {food.brand && (
                      <p className="text-xs text-foreground/65 truncate">{food.brand}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs tabular-nums text-foreground/65">
                      {food.macrosPer100g.kcal} kcal
                    </span>
                    <MacroPill value={food.macrosPer100g.protein} label="P" tone="emerald" />
                    <MacroPill value={food.macrosPer100g.carbs} label="C" tone="amber" />
                    <MacroPill value={food.macrosPer100g.fat} label="F" tone="pink" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmId(food._id)}
                    aria-label={`Delete ${food.name}`}
                    className="shrink-0 size-7 text-foreground/25 hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </m.div>
              ))}
            </m.div>
          )}
        </div>
      </div>

      {/* Create food dialog */}
      <Dialog open={create.open} onOpenChange={(v) => { if (!v) dispatchCreate({ type: 'CLOSE' }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Food</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} noValidate>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="food-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="food-name"
                  value={create.name}
                  onChange={(e) => dispatchCreate({ type: 'SET_NAME', value: e.target.value })}
                  placeholder="e.g. Chicken Breast"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="food-brand">
                  Brand <span className="text-foreground/65">(optional)</span>
                </Label>
                <Input
                  id="food-brand"
                  value={create.brand}
                  onChange={(e) => dispatchCreate({ type: 'SET_BRAND', value: e.target.value })}
                  placeholder="e.g. Generic"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="food-kcal">
                    Calories (kcal) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="food-kcal"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={create.kcal}
                    onChange={(e) => dispatchCreate({ type: 'SET_KCAL', value: e.target.value })}
                    placeholder="0"
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="food-protein">
                    Protein (g) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="food-protein"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={create.protein}
                    onChange={(e) => dispatchCreate({ type: 'SET_PROTEIN', value: e.target.value })}
                    placeholder="0"
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="food-carbs">
                    Carbs (g) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="food-carbs"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={create.carbs}
                    onChange={(e) => dispatchCreate({ type: 'SET_CARBS', value: e.target.value })}
                    placeholder="0"
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="food-fat">
                    Fat (g) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="food-fat"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    value={create.fat}
                    onChange={(e) => dispatchCreate({ type: 'SET_FAT', value: e.target.value })}
                    placeholder="0"
                    className="tabular-nums"
                  />
                </div>
              </div>
              {create.error && (
                <p className="text-xs text-destructive">{create.error}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => dispatchCreate({ type: 'CLOSE' })}
                disabled={create.submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.submitting || !create.name.trim()}>
                {create.submitting ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmId !== null} onOpenChange={(open) => { if (!open) setConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete food?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()} className="bg-destructive/10 text-destructive hover:bg-destructive/20">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LazyMotion>
  );
}
