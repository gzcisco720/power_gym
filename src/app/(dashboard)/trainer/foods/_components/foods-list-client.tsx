'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

interface FoodListItem {
  _id: string;
  name: string;
  brand: string | null;
  macrosPer100g: { kcal: number; protein: number; carbs: number; fat: number };
  servings: { label: string; grams: number }[];
}

interface Props {
  basePath: string;
}

async function fetchFoods(q: string): Promise<FoodListItem[]> {
  const url = q.trim() ? `/api/foods?q=${encodeURIComponent(q.trim())}` : '/api/foods';
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { foods: FoodListItem[] };
  return data.foods;
}

export function FoodsListClient({ basePath }: Props) {
  const [items, setItems] = useState<FoodListItem[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const handle = setTimeout(() => {
      fetchFoods(q)
        .then((foods) => {
          if (!cancelled) {
            setItems(foods);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q]);

  async function handleDelete(id: string): Promise<void> {
    if (!confirm('Delete this food?')) return;
    const res = await fetch(`/api/foods/${id}`, { method: 'DELETE' });
    if (res.ok) setItems((curr) => curr.filter((it) => it._id !== id));
  }

  return (
    <div>
      <PageHeader
        title="My Foods"
        subtitle={loading ? undefined : `${items.length} food${items.length !== 1 ? 's' : ''}`}
        actions={
          <Link
            href={`${basePath}/new`}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Food
          </Link>
        }
      />

      <div className="px-4 sm:px-8 py-7 space-y-4">
        <Input
          placeholder="Filter by name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-[#0c0c0c] border-[#222] text-white placeholder:text-[#555] focus-visible:ring-0 focus-visible:border-[#444]"
        />

        {loading ? (
          <div className="text-center text-sm text-[#555] py-10">Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState
            heading="No foods yet"
            description={
              q.trim()
                ? `No foods matching "${q}".`
                : 'Create your first food to build your personal library.'
            }
            action={
              !q.trim() ? (
                <Link
                  href={`${basePath}/new`}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
                >
                  Create Food
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {items.map((f) => (
              <li key={f._id}>
                <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 flex items-start justify-between hover:border-[#2a2a2a] transition-colors">
                  <div>
                    <div className="text-[14px] font-semibold text-white">
                      {f.name}
                      {f.brand ? (
                        <span className="text-[#666] font-normal"> · {f.brand}</span>
                      ) : null}
                    </div>
                    <div className="text-[12px] text-[#666] mt-0.5">
                      {f.macrosPer100g.kcal.toFixed(0)} kcal · {f.macrosPer100g.protein.toFixed(1)}P ·{' '}
                      {f.macrosPer100g.carbs.toFixed(1)}C · {f.macrosPer100g.fat.toFixed(1)}F &nbsp;/&nbsp; per 100g
                    </div>
                    {f.servings.length > 0 && (
                      <div className="text-[11px] text-[#555] mt-0.5">
                        {f.servings.map((s) => s.label).join(', ')}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(f._id)}
                    className="shrink-0 ml-2 text-[#777] hover:text-red-400 hover:bg-[#141414]"
                    aria-label="Delete food"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
