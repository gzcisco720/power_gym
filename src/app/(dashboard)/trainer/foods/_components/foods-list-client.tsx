'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Trash2, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { MacroPill } from '@/components/nutrition/macro-pill';

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
  const shouldReduce = useReducedMotion();
  const [items, setItems] = useState<FoodListItem[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FoodListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handle = setTimeout(() => {
      if (cancelled) return;
      setSearching(true);
      fetchFoods(q)
        .then((foods) => {
          if (cancelled) return;
          setItems(foods);
          setLoading(false);
          setSearching(false);
        })
        .catch(() => {
          if (cancelled) return;
          setLoading(false);
          setSearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q]);

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/foods/${pendingDelete._id}`, { method: 'DELETE' });
    setDeleting(false);
    if (res.ok) {
      setItems((curr) => curr.filter((it) => it._id !== pendingDelete._id));
      toast.success(`Deleted "${pendingDelete.name}"`);
      setPendingDelete(null);
    } else {
      toast.error('Failed to delete food');
    }
  }

  const subtitle = useMemo(() => {
    if (loading) return undefined;
    return `${items.length} food${items.length !== 1 ? 's' : ''}`;
  }, [items.length, loading]);

  return (
    <div>
      <PageHeader
        title="My Foods"
        subtitle={subtitle}
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

      <div className="px-4 sm:px-8 py-7 space-y-3">
        {/* Search box with icon + clear + spinner */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/65" />
          <Input
            placeholder="Filter by name..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 pl-9 pr-9 text-sm"
            aria-label="Filter foods by name"
          />
          {q && !searching && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/65 hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              aria-label="Clear filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground/65" />
          )}
        </div>

        {loading ? (
          <ul className="space-y-2" aria-busy="true" aria-label="Loading foods">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <FoodCardSkeleton />
              </li>
            ))}
          </ul>
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
          <ul className="space-y-1.5">
            {items.map((f, idx) => (
              <motion.li
                key={f._id}
                initial={{ opacity: 0, y: shouldReduce ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduce ? 0 : idx * 0.02 }}
                className="relative group"
              >
                <Link
                  href={`${basePath}/${f._id}/edit`}
                  aria-label={`Edit ${f.name}`}
                  className="block rounded-lg bg-card ring-1 ring-foreground/10 px-3 py-2 pr-10 transition-colors hover:ring-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {/* Row 1: name (+ brand) on left, macros on right */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {f.name}
                      </span>
                      {f.brand && (
                        <span className="text-xs text-foreground/65 truncate">
                          · {f.brand}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs shrink-0 tabular-nums">
                      <span className="font-semibold text-foreground">
                        {f.macrosPer100g.kcal.toFixed(0)}
                        <span className="ml-1 font-normal text-foreground/65">kcal</span>
                      </span>
                      <MacroPill value={f.macrosPer100g.protein} label="P" tone="emerald" />
                      <MacroPill value={f.macrosPer100g.carbs} label="C" tone="amber" />
                      <MacroPill value={f.macrosPer100g.fat} label="F" tone="pink" />
                      <span className="text-[10px] text-foreground/65">/100g</span>
                    </div>
                  </div>
                  {/* Row 2 (only if servings) */}
                  {f.servings.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {f.servings.map((s, i) => (
                        <span
                          key={`${s.label}-${i}`}
                          className="inline-flex items-baseline rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-foreground/80 ring-1 ring-foreground/5"
                        >
                          {s.label}
                          <span className="ml-1 text-foreground/65">· {s.grams}g</span>
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingDelete(f)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-foreground/65 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  aria-label={`Delete ${f.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete food?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/65">
            &ldquo;{pendingDelete?.name}&rdquo; will be removed from your food library. Existing
            nutrition plans that reference it keep their stored macros.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FoodCardSkeleton() {
  return (
    <Card className="px-3 py-2">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="ml-auto h-4 w-40" />
      </div>
    </Card>
  );
}
