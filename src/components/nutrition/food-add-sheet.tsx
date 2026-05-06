'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { calculateMacros, type MacroSnapshot } from '@/lib/nutrition/macros';

export interface AddedMealItem extends MacroSnapshot {
  foodName: string;
  quantityG: number;
}

interface SearchResult {
  name: string;
  per100g: {
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
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: AddedMealItem) => void;
}

const NUM_FIELDS = [
  ['kcal', 'kcal'],
  ['protein', 'protein'],
  ['carbs', 'carbs'],
  ['fat', 'fat'],
  ['fiber', 'fiber'],
  ['sugar', 'sugar'],
  ['salt', 'salt'],
  ['saturated', 'saturated'],
  ['polyunsaturated', 'polyunsaturated'],
  ['monounsaturated', 'monounsaturated'],
  ['polyols', 'polyols'],
] as const;

type ManualKey = (typeof NUM_FIELDS)[number][0];

export function FoodAddSheet({ open, onOpenChange, onAdd }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Food</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="search" className="mt-4">
          <TabsList>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="search">
            <SearchTab onAdd={(item) => { onAdd(item); onOpenChange(false); }} />
          </TabsContent>
          <TabsContent value="manual">
            <ManualTab onAdd={(item) => { onAdd(item); onOpenChange(false); }} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function SearchTab({ onAdd }: { onAdd: (item: AddedMealItem) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [amount, setAmount] = useState(100);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!query) {
        setResults([]);
        return;
      }
      void fetch(`/api/food-search?q=${encodeURIComponent(query)}`).then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const macros = useMemo(() => {
    if (!selected) return null;
    return calculateMacros({ per100g: selected.per100g, perServing: null }, amount);
  }, [selected, amount]);

  return (
    <div className="space-y-3 py-3">
      <Input
        placeholder="Search OpenFoodFacts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="divide-y border rounded">
        {results.map((r) => (
          <li
            key={r.name}
            className="px-2 py-1.5 cursor-pointer hover:bg-muted text-sm flex justify-between"
            onClick={() => setSelected(r)}
          >
            <span>{r.name}</span>
            <span className="text-muted-foreground">
              {r.per100g.kcal} · {r.per100g.protein}P · {r.per100g.carbs}C · {r.per100g.fat}F
            </span>
          </li>
        ))}
      </ul>
      {selected !== null && macros !== null && (
        <div className="space-y-2 pt-2 border-t">
          <Label htmlFor="search-amount">Amount (g)</Label>
          <Input
            id="search-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
          <div className="text-sm text-muted-foreground">
            {macros.kcal.toFixed(0)} kcal · {macros.protein.toFixed(1)}P · {macros.carbs.toFixed(1)}C ·{' '}
            {macros.fat.toFixed(1)}F
          </div>
          <Button onClick={() => onAdd({ foodName: selected.name, quantityG: amount, ...macros })}>
            Add
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Powered by Open Food Facts</p>
    </div>
  );
}

function ManualTab({ onAdd }: { onAdd: (item: AddedMealItem) => void }) {
  const [name, setName] = useState('');
  const [vals, setVals] = useState<Record<ManualKey, number>>({
    kcal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    salt: 0,
    saturated: 0,
    polyunsaturated: 0,
    monounsaturated: 0,
    polyols: 0,
  });
  const [amount, setAmount] = useState(100);

  const macros = useMemo(() => {
    return calculateMacros({ per100g: vals, perServing: null }, amount);
  }, [vals, amount]);

  return (
    <div className="grid grid-cols-2 gap-2 py-3">
      <div className="col-span-2">
        <Label htmlFor="manual-name">Name</Label>
        <Input id="manual-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {NUM_FIELDS.map(([key, label]) => (
        <div key={key}>
          <Label htmlFor={`manual-${key}`} className="capitalize">
            {label}
          </Label>
          <Input
            id={`manual-${key}`}
            type="number"
            value={vals[key]}
            onChange={(e) => setVals((v) => ({ ...v, [key]: Number(e.target.value) || 0 }))}
          />
        </div>
      ))}
      <div className="col-span-2">
        <Label htmlFor="manual-amount">Amount (g)</Label>
        <Input
          id="manual-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
        />
      </div>
      <div className="col-span-2 text-sm text-muted-foreground">
        Total: {macros.kcal.toFixed(0)} kcal · {macros.protein.toFixed(1)}P · {macros.carbs.toFixed(1)}C ·{' '}
        {macros.fat.toFixed(1)}F
      </div>
      <div className="col-span-2">
        <Button
          disabled={!name}
          onClick={() => onAdd({ foodName: name, quantityG: amount, ...macros })}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
