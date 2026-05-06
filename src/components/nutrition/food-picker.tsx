'use client';
import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { calculateMacros, type MacroSnapshot } from '@/lib/nutrition/macros';
import type { FatSecretFood, FatSecretServing } from '@/lib/nutrition/fatsecret-client';

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

export interface PickedFood {
  foodName: string;
  quantityG: number;
  macros: MacroSnapshot;
}

interface FoodPickerProps {
  memberId: string;
  onSelect: (item: PickedFood) => void;
  onCreateNewHref?: string;
  hideRecent?: boolean;
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function FoodPicker({ memberId, onSelect, onCreateNewHref, hideRecent }: FoodPickerProps) {
  const tabCols = hideRecent ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-3">
      {onCreateNewHref && (
        <div className="flex justify-end">
          <a href={onCreateNewHref} className="text-sm text-primary underline">
            + Create New
          </a>
        </div>
      )}
      <Tabs defaultValue="all">
        <TabsList className={`grid w-full ${tabCols}`}>
          <TabsTrigger value="all">All</TabsTrigger>
          {!hideRecent && <TabsTrigger value="recent">Recent</TabsTrigger>}
          <TabsTrigger value="my">My Food</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <AllTab onSelect={onSelect} />
        </TabsContent>
        {!hideRecent && (
          <TabsContent value="recent">
            <RecentTab memberId={memberId} onSelect={onSelect} />
          </TabsContent>
        )}
        <TabsContent value="my">
          <MyFoodTab onSelect={onSelect} />
        </TabsContent>
      </Tabs>
      <p className="text-xs text-muted-foreground text-center pt-2 border-t">Powered by FatSecret</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AllTab — FatSecret search with debounce + detail panel
// ---------------------------------------------------------------------------

function AllTab({ onSelect }: { onSelect: (i: PickedFood) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FatSecretFood[]>([]);
  const [selected, setSelected] = useState<FatSecretFood | null>(null);
  const [servingId, setServingId] = useState<string>('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { results: FatSecretFood[] };
      if (!cancelled) setResults(data.results);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q]);

  const serving: FatSecretServing | null = useMemo(() => {
    if (!selected) return null;
    return selected.servings.find((s) => s.servingId === servingId) ?? selected.defaultServing;
  }, [selected, servingId]);

  const macros: MacroSnapshot | null = useMemo(() => {
    if (!serving) return null;
    return calculateMacros(
      {
        per100g: null,
        perServing: {
          kcal: serving.calories,
          protein: serving.protein,
          carbs: serving.carbs,
          fat: serving.fat,
          fiber: serving.fiber,
          sugar: serving.sugar,
          saturated: serving.saturated,
          polyunsaturated: serving.polyunsaturated,
          monounsaturated: serving.monounsaturated,
          cholesterol: serving.cholesterol,
          sodium: serving.sodium,
          potassium: serving.potassium,
          transFat: serving.transFat,
          servingLabel: serving.description,
          grams: serving.grams,
        },
      },
      serving.grams * qty,
    );
  }, [serving, qty]);

  function handleSelect(food: FatSecretFood) {
    setSelected(food);
    setServingId(food.defaultServing.servingId);
    setQty(1);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
      <div className="space-y-2">
        <Input
          placeholder="Search foods..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="divide-y border rounded max-h-96 overflow-auto">
          {results.map((f) => (
            <li
              key={f.foodId}
              className={`px-2 py-1.5 cursor-pointer hover:bg-muted text-sm ${selected?.foodId === f.foodId ? 'bg-muted' : ''}`}
              onClick={() => handleSelect(f)}
            >
              <div className="flex justify-between">
                <span>
                  {f.name}
                  {f.brand ? ` · ${f.brand}` : ''}
                </span>
                <span className="text-muted-foreground">
                  {f.defaultServing.calories.toFixed(0)} kcal
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{f.defaultServing.description}</div>
            </li>
          ))}
          {results.length === 0 && q.trim() && (
            <li className="p-3 text-center text-sm text-muted-foreground">No results</li>
          )}
        </ul>
      </div>
      {selected && serving && macros && (
        <Card className="p-3 space-y-2">
          <div className="font-medium">{selected.name}</div>
          <Select value={servingId} onValueChange={(v) => setServingId(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selected.servings.map((s) => (
                <SelectItem key={s.servingId} value={s.servingId}>
                  {s.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
          />
          <div className="text-sm text-muted-foreground">
            {macros.kcal.toFixed(0)} kcal · {macros.protein.toFixed(1)}P · {macros.carbs.toFixed(1)}C ·{' '}
            {macros.fat.toFixed(1)}F
          </div>
          <Button
            onClick={() =>
              onSelect({
                foodName: selected.brand
                  ? `${selected.brand} ${selected.name}`
                  : selected.name,
                quantityG: serving.grams * qty,
                macros,
              })
            }
          >
            Add
          </Button>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentTab — member's distinct recent items
// ---------------------------------------------------------------------------

function RecentTab({
  memberId,
  onSelect,
}: {
  memberId: string;
  onSelect: (i: PickedFood) => void;
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

  return (
    <ul className="divide-y border rounded mt-2">
      {items.map((it, idx) => (
        <li
          key={`${it.foodName}-${idx}`}
          className="px-2 py-2 cursor-pointer hover:bg-muted text-sm flex justify-between"
          onClick={() =>
            onSelect({
              foodName: it.foodName,
              quantityG: it.quantityG,
              macros: { kcal: it.kcal, protein: it.protein, carbs: it.carbs, fat: it.fat },
            })
          }
        >
          <span>{it.foodName}</span>
          <span className="text-muted-foreground">
            {it.quantityG.toFixed(0)} g · {it.kcal.toFixed(0)} kcal
          </span>
        </li>
      ))}
      {items.length === 0 && (
        <li className="p-3 text-center text-sm text-muted-foreground">No recent items</li>
      )}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// MyFoodTab — trainer-curated custom foods
// ---------------------------------------------------------------------------

function MyFoodTab({ onSelect }: { onSelect: (i: PickedFood) => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<MyFoodItem[]>([]);
  const [selected, setSelected] = useState<MyFoodItem | null>(null);
  const [servingIdx, setServingIdx] = useState(0);
  const [qty, setQty] = useState(1);

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

  const serving = selected?.servings[servingIdx] ?? null;

  const macros: MacroSnapshot | null = useMemo(() => {
    if (!selected || !serving) return null;
    return calculateMacros(
      { per100g: selected.macrosPer100g, perServing: null },
      serving.grams * qty,
    );
  }, [selected, serving, qty]);

  function handleSelect(food: MyFoodItem) {
    setSelected(food);
    setServingIdx(0);
    setQty(1);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
      <div className="space-y-2">
        <Input
          placeholder="Filter your foods..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="divide-y border rounded max-h-96 overflow-auto">
          {items.map((f) => (
            <li
              key={f._id}
              className={`px-2 py-1.5 cursor-pointer hover:bg-muted text-sm ${selected?._id === f._id ? 'bg-muted' : ''}`}
              onClick={() => handleSelect(f)}
            >
              <div className="flex justify-between">
                <span>
                  {f.brand ? `${f.brand} · ` : ''}
                  {f.name}
                </span>
                <span className="text-muted-foreground">
                  {f.macrosPer100g.kcal.toFixed(0)} /100g
                </span>
              </div>
            </li>
          ))}
          {items.length === 0 && (
            <li className="p-3 text-center text-sm text-muted-foreground">No foods yet</li>
          )}
        </ul>
      </div>
      {selected && serving && macros && (
        <Card className="p-3 space-y-2">
          <div className="font-medium">{selected.name}</div>
          <Select
            value={String(servingIdx)}
            onValueChange={(v) => setServingIdx(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selected.servings.map((s, i) => (
                <SelectItem key={i} value={String(i)}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
          />
          <div className="text-sm text-muted-foreground">
            {macros.kcal.toFixed(0)} kcal · {macros.protein.toFixed(1)}P · {macros.carbs.toFixed(1)}C ·{' '}
            {macros.fat.toFixed(1)}F
          </div>
          <Button
            onClick={() =>
              onSelect({
                foodName: selected.brand
                  ? `${selected.brand} ${selected.name}`
                  : selected.name,
                quantityG: serving.grams * qty,
                macros,
              })
            }
          >
            Add
          </Button>
        </Card>
      )}
    </div>
  );
}
