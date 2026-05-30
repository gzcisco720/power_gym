import { useCallback, useEffect, useReducer } from 'react';
import { Loader2Icon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PickedFood } from '@/components/nutrition/food-picker.types';
import { request } from '@/api/client';

const BASE = '/api/v1';

interface FoodItem {
  _id: string;
  name: string;
  brand: string | null;
  macrosPer100g: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    salt?: number;
    saturated?: number;
    polyunsaturated?: number;
    monounsaturated?: number;
    polyols?: number;
    cholesterol?: number;
    sodium?: number;
    potassium?: number;
    transFat?: number;
  };
  servings: { label: string; grams: number }[];
}

export interface FoodPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string | null;
  onSelect: (item: PickedFood) => void;
}

type DialogView = 'list' | 'detail';

interface State {
  view: DialogView;
  foods: FoodItem[];
  query: string;
  loading: boolean;
  selected: FoodItem | null;
  qty: string;
  servingIdx: number;
}

type Action =
  | { type: 'SET_FOODS'; value: FoodItem[] }
  | { type: 'SET_QUERY'; value: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SELECT'; value: FoodItem }
  | { type: 'SET_QTY'; value: string }
  | { type: 'SET_SERVING_IDX'; value: number }
  | { type: 'BACK' }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FOODS': return { ...state, foods: action.value };
    case 'SET_QUERY': return { ...state, query: action.value };
    case 'SET_LOADING': return { ...state, loading: action.value };
    case 'SELECT': return { ...state, view: 'detail', selected: action.value, qty: '100', servingIdx: 0 };
    case 'SET_QTY': return { ...state, qty: action.value };
    case 'SET_SERVING_IDX': return { ...state, servingIdx: action.value };
    case 'BACK': return { ...state, view: 'list', selected: null };
    case 'RESET': return { view: 'list', foods: [], query: '', loading: false, selected: null, qty: '100', servingIdx: 0 };
    default: return state;
  }
}

function scale(per100g: number, grams: number): number {
  return (per100g * grams) / 100;
}

export function FoodPickerDialog({ open, onOpenChange, onSelect }: FoodPickerDialogProps) {
  const [state, dispatch] = useReducer(reducer, {
    view: 'list', foods: [], query: '', loading: false, selected: null, qty: '100', servingIdx: 0,
  });
  const { view, foods, query, loading, selected, qty, servingIdx } = state;

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) dispatch({ type: 'RESET' });
    onOpenChange(isOpen);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    dispatch({ type: 'SET_LOADING', value: true });
    request<FoodItem[]>(`${BASE}/foods`)
      .then((items) => dispatch({ type: 'SET_FOODS', value: items }))
      .catch(() => dispatch({ type: 'SET_FOODS', value: [] }))
      .finally(() => dispatch({ type: 'SET_LOADING', value: false }));
  }, [open]);

  const filtered = query.trim()
    ? foods.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
    : foods;

  function handleAdd() {
    if (!selected) return;
    const grams = selected.servings.length > 0
      ? (selected.servings[servingIdx]?.grams ?? (parseFloat(qty) || 100))
      : (parseFloat(qty) || 100);
    const qtyG = grams;
    const m = selected.macrosPer100g;
    onSelect({
      foodName: selected.name,
      quantityG: qtyG,
      macros: {
        kcal: scale(m.kcal, qtyG),
        protein: scale(m.protein, qtyG),
        carbs: scale(m.carbs, qtyG),
        fat: scale(m.fat, qtyG),
        ...(m.fiber !== undefined && { fiber: scale(m.fiber, qtyG) }),
        ...(m.sugar !== undefined && { sugar: scale(m.sugar, qtyG) }),
        ...(m.salt !== undefined && { salt: scale(m.salt, qtyG) }),
        ...(m.saturated !== undefined && { saturated: scale(m.saturated, qtyG) }),
        ...(m.polyunsaturated !== undefined && { polyunsaturated: scale(m.polyunsaturated, qtyG) }),
        ...(m.monounsaturated !== undefined && { monounsaturated: scale(m.monounsaturated, qtyG) }),
        ...(m.polyols !== undefined && { polyols: scale(m.polyols, qtyG) }),
        ...(m.cholesterol !== undefined && { cholesterol: scale(m.cholesterol, qtyG) }),
        ...(m.sodium !== undefined && { sodium: scale(m.sodium, qtyG) }),
        ...(m.potassium !== undefined && { potassium: scale(m.potassium, qtyG) }),
        ...(m.transFat !== undefined && { transFat: scale(m.transFat, qtyG) }),
      },
    });
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        {view === 'list' && (
          <>
            <DialogHeader>
              <DialogTitle>Add Food</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Search foods…"
                value={query}
                onChange={(e) => dispatch({ type: 'SET_QUERY', value: e.target.value })}
                className="h-9 text-sm"
              />
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2Icon className="size-5 animate-spin text-foreground/65" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-foreground/65">
                  {query ? 'No foods found.' : 'No foods in your library yet.'}
                </p>
              ) : (
                <ul className="space-y-0.5 max-h-[50vh] overflow-y-auto">
                  {filtered.map((food) => (
                    <li key={food._id}>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'SELECT', value: food })}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{food.name}</div>
                          {food.brand && (
                            <div className="text-[11px] text-foreground/65 truncate">{food.brand}</div>
                          )}
                        </div>
                        <div className="shrink-0 text-[11px] text-foreground/65 tabular-nums">
                          {food.macrosPer100g.kcal.toFixed(0)} kcal/100g
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
        {view === 'detail' && selected && (
          <div className="space-y-4">
            <div>
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'BACK' })} className="px-2 -ml-2 mb-0.5">
                ← Back
              </Button>
              <h2 className="font-semibold text-base leading-snug">{selected.name}</h2>
            </div>

            {selected.servings.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground/65">Serving</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.servings.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_SERVING_IDX', value: i })}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        i === servingIdx
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted text-foreground/65 hover:border-foreground/30 hover:text-foreground'
                      }`}
                    >
                      {s.label} · {s.grams}g
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <label htmlFor="food-qty" className="text-xs font-medium text-foreground/65">
                  Quantity (g)
                </label>
                <Input
                  id="food-qty"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={qty}
                  onChange={(e) => dispatch({ type: 'SET_QTY', value: e.target.value })}
                  aria-label="Quantity in grams"
                />
              </div>
            )}

            {(() => {
              const grams = selected.servings.length > 0
                ? selected.servings[servingIdx]?.grams ?? 100
                : parseFloat(qty) || 100;
              const m = selected.macrosPer100g;
              return (
                <div className="rounded-xl bg-muted/40 px-4 py-5 text-center space-y-3">
                  <div>
                    <div className="text-5xl font-bold tabular-nums leading-none">
                      {scale(m.kcal, grams).toFixed(0)}
                    </div>
                    <div className="text-xs text-foreground/65 mt-1.5">Calories</div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-flex items-baseline gap-0.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-emerald-300">
                      {scale(m.protein, grams).toFixed(1)}
                      <span className="text-[11px] font-normal opacity-80">g P</span>
                    </span>
                    <span className="inline-flex items-baseline gap-0.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-amber-300">
                      {scale(m.carbs, grams).toFixed(1)}
                      <span className="text-[11px] font-normal opacity-80">g C</span>
                    </span>
                    <span className="inline-flex items-baseline gap-0.5 rounded-lg bg-pink-500/15 px-3 py-1.5 text-sm font-semibold tabular-nums text-pink-300">
                      {scale(m.fat, grams).toFixed(1)}
                      <span className="text-[11px] font-normal opacity-80">g F</span>
                    </span>
                  </div>
                </div>
              );
            })()}

            <Button className="w-full" onClick={handleAdd}>
              + Add to meal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
