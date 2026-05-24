'use client';
import { useEffect, useState } from 'react';
import { Loader2Icon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { calculateMacros } from '@/lib/nutrition/macros';
import type { FatSecretFood, FatSecretServing } from '@/lib/nutrition/fatsecret-client';
import type { FoodEntry } from './food-picker.types';
export type { PickedFood, FoodServing, FoodEntry } from './food-picker.types';
export { computePickedFood } from './food-picker.utils';
export { useMacroPreview } from './use-macro-preview';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MyFoodItem {
  _id: string;
  name: string;
  brand: string | null;
  macrosPer100g: { kcal: number; protein: number; carbs: number; fat: number };
  servings: { label: string; grams: number }[];
}

interface FoodPickerProps {
  /** null = trainer/template context — hides the Recent tab */
  memberId: string | null;
  onSelectFood: (entry: FoodEntry) => void;
  /** Navigate to a new-food page (closes dialog context) */
  onCreateNewHref?: string;
  /** Open create-food form inline (preferred in dialog context) */
  onCreateNew?: () => void;
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function FoodPicker({ memberId, onSelectFood, onCreateNewHref, onCreateNew }: FoodPickerProps) {
  const showRecent = memberId !== null;
  const tabCols = showRecent ? 'grid-cols-3' : 'grid-cols-2';

  const hasCreateAction = onCreateNew ?? onCreateNewHref;

  return (
    <div className="space-y-3">
      {hasCreateAction && (
        <div className="flex justify-end">
          {onCreateNew ? (
            <button
              type="button"
              onClick={onCreateNew}
              className="text-sm text-primary underline"
            >
              + Create New
            </button>
          ) : (
            <a href={onCreateNewHref} className="text-sm text-primary underline">
              + Create New
            </a>
          )}
        </div>
      )}
      <Tabs defaultValue="all">
        <TabsList className={`grid w-full ${tabCols}`}>
          <TabsTrigger value="all">All</TabsTrigger>
          {showRecent && <TabsTrigger value="recent">Recent</TabsTrigger>}
          <TabsTrigger value="my">My Food</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <AllTab onSelectFood={onSelectFood} />
        </TabsContent>
        {showRecent && (
          <TabsContent value="recent">
            <RecentTab memberId={memberId} onSelectFood={onSelectFood} />
          </TabsContent>
        )}
        <TabsContent value="my">
          <MyFoodTab onSelectFood={onSelectFood} />
        </TabsContent>
      </Tabs>
      <p className="text-xs text-muted-foreground text-center pt-2 border-t">Powered by FatSecret</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared table-row renderer
// ---------------------------------------------------------------------------

interface FoodRowProps {
  name: string;
  brand: string | null;
  servingLabel: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  onClick: () => void;
}

function FoodRow({ name, brand, servingLabel, kcal, protein, carbs, fat, onClick }: FoodRowProps) {
  const displayName = brand ? `${name} · ${brand}` : name;
  return (
    <div
      role="row"
      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 items-start px-2 py-2 cursor-pointer hover:bg-muted border-b last:border-b-0 text-sm"
      onClick={onClick}
    >
      {/* Title cell: name + serving label */}
      <div className="min-w-0">
        <div className="font-medium leading-tight truncate">{displayName}</div>
        <div className="text-xs text-foreground/65">{servingLabel}</div>
      </div>
      {/* Macro cells — right-aligned, tabular-nums */}
      <div className="text-right tabular-nums text-foreground/65">{kcal.toFixed(0)}</div>
      <div className="text-right tabular-nums text-foreground/65">{protein.toFixed(1)}g</div>
      <div className="text-right tabular-nums text-foreground/65">{carbs.toFixed(1)}g</div>
      <div className="text-right tabular-nums text-foreground/65">{fat.toFixed(1)}g</div>
    </div>
  );
}

/** Column header row for the food list table */
function FoodTableHeader() {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 px-2 py-1 text-xs font-medium text-foreground/65 border-b">
      <div>Title</div>
      <div className="text-right">kcal</div>
      <div className="text-right">P</div>
      <div className="text-right">C</div>
      <div className="text-right">F</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AllTab — FatSecret search triggered by button / Enter
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

function AllTab({ onSelectFood }: { onSelectFood: (entry: FoodEntry) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FatSecretFood[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function runSearch(newPage = 0): Promise<void> {
    const query = q.trim();
    if (!query) return;
    if (newPage === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const url = `/api/food-search?q=${encodeURIComponent(query)}&page_size=${PAGE_SIZE}&page_number=${newPage}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (newPage === 0) setResults([]);
        return;
      }
      const data = (await res.json()) as { results: FatSecretFood[]; total: number; page: number };
      if (newPage === 0) {
        setResults(data.results);
      } else {
        setResults((prev) => [...prev, ...data.results]);
      }
      setTotal(data.total);
      setPage(newPage);
    } finally {
      setHasSearched(true);
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleRowClick(food: FatSecretFood): void {
    const entry: FoodEntry = {
      source: 'fatsecret',
      foodId: food.foodId,
      name: food.name,
      brand: food.brand,
      servings: food.servings.map((s: FatSecretServing) => ({
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
      })),
      defaultServingId: food.defaultServing.servingId,
    };
    onSelectFood(entry);
  }

  return (
    <div className="space-y-2 mt-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(0);
        }}
      >
        <Input
          placeholder="Search foods..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" disabled={loading || !q.trim()}>
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : 'Search'}
        </Button>
      </form>
      <div className="border rounded overflow-hidden">
        <FoodTableHeader />
        <div className="max-h-96 overflow-auto divide-y">
          {results.map((f) => (
            <FoodRow
              key={f.foodId}
              name={f.name}
              brand={f.brand}
              servingLabel={f.defaultServing.description}
              kcal={f.defaultServing.calories}
              protein={f.defaultServing.protein}
              carbs={f.defaultServing.carbs}
              fat={f.defaultServing.fat}
              onClick={() => handleRowClick(f)}
            />
          ))}
          {results.length === 0 && hasSearched && !loading && (
            <div className="p-3 text-center text-sm text-muted-foreground">No results</div>
          )}
          {results.length > 0 && results.length < total && (
            <div className="px-3 py-2 border-t text-center">
              {loadingMore ? (
                <Loader2Icon className="size-4 animate-spin inline text-foreground/65" />
              ) : (
                <button
                  type="button"
                  onClick={() => void runSearch(page + 1)}
                  className="text-xs text-foreground/65 hover:text-foreground"
                >
                  Load more · {results.length} of {total}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentTab — member's distinct recent items
// ---------------------------------------------------------------------------

function RecentTab({
  memberId,
  onSelectFood,
}: {
  memberId: string;
  onSelectFood: (entry: FoodEntry) => void;
}) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/members/${memberId}/nutrition/recent`).then(async (res) => {
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { recent: RecentItem[] };
      if (!cancelled) setItems(data.recent);
    });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  function handleRowClick(it: RecentItem): void {
    // Recent items have full macros pre-bound; map to a single-serving entry
    const servingId = `recent-${it.foodName}`;
    const entry: FoodEntry = {
      source: 'recent',
      name: it.foodName,
      brand: null,
      servings: [
        {
          id: servingId,
          label: `${it.quantityG.toFixed(0)} g`,
          grams: it.quantityG,
          macros: {
            kcal: it.kcal,
            protein: it.protein,
            carbs: it.carbs,
            fat: it.fat,
          },
        },
      ],
      defaultServingId: servingId,
    };
    onSelectFood(entry);
  }

  return (
    <div className="border rounded overflow-hidden mt-2">
      <FoodTableHeader />
      <div className="divide-y">
        {items.map((it, idx) => (
          <FoodRow
            key={`${it.foodName}-${idx}`}
            name={it.foodName}
            brand={null}
            servingLabel={`${it.quantityG.toFixed(0)} g`}
            kcal={it.kcal}
            protein={it.protein}
            carbs={it.carbs}
            fat={it.fat}
            onClick={() => handleRowClick(it)}
          />
        ))}
        {items.length === 0 && (
          <div className="p-3 text-center text-sm text-muted-foreground">No recent items</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MyFoodTab — trainer-curated custom foods
// ---------------------------------------------------------------------------

function MyFoodTab({ onSelectFood }: { onSelectFood: (entry: FoodEntry) => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<MyFoodItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      const url = q ? `/api/foods?q=${encodeURIComponent(q)}` : '/api/foods';
      const res = await fetch(url);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { foods: MyFoodItem[] };
      if (!cancelled) setItems(data.foods);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q]);

  function handleRowClick(food: MyFoodItem): void {
    const entry: FoodEntry = {
      source: 'myfood',
      name: food.name,
      brand: food.brand,
      servings: food.servings.map((s, i) => {
        const macros = calculateMacros(
          { per100g: food.macrosPer100g, perServing: null },
          s.grams,
        );
        return {
          id: String(i),
          label: s.label,
          grams: s.grams,
          macros: {
            kcal: macros.kcal,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
          },
        };
      }),
      defaultServingId: '0',
    };
    onSelectFood(entry);
  }

  // Default serving macros for display in list row (first serving per 100g)
  function getDefaultMacros(food: MyFoodItem): { kcal: number; protein: number; carbs: number; fat: number } {
    const serving = food.servings[0];
    if (!serving) return food.macrosPer100g;
    const m = calculateMacros({ per100g: food.macrosPer100g, perServing: null }, serving.grams);
    return { kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat };
  }

  return (
    <div className="space-y-2 mt-2">
      <Input
        placeholder="Filter your foods..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="border rounded overflow-hidden">
        <FoodTableHeader />
        <div className="max-h-96 overflow-auto divide-y">
          {items.map((f) => {
            const m = getDefaultMacros(f);
            const servingLabel = f.servings[0]?.label ?? '/100g';
            return (
              <FoodRow
                key={f._id}
                name={f.name}
                brand={f.brand}
                servingLabel={servingLabel}
                kcal={m.kcal}
                protein={m.protein}
                carbs={m.carbs}
                fat={m.fat}
                onClick={() => handleRowClick(f)}
              />
            );
          })}
          {items.length === 0 && (
            <div className="p-3 text-center text-sm text-muted-foreground">No foods yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

