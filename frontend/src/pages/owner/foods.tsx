import { useEffect, useMemo, useReducer } from 'react';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import { Plus, Trash2, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useFoodsStore } from '@/stores/foodsStore';
import type { FoodItem } from '@/api/foods';

interface FoodsListState {
  q: string;
  searching: boolean;
  pendingDelete: FoodItem | null;
  deleting: boolean;
}

type FoodsListAction =
  | { type: 'SET_Q'; value: string }
  | { type: 'SET_SEARCHING'; value: boolean }
  | { type: 'SET_PENDING_DELETE'; value: FoodItem | null }
  | { type: 'SET_DELETING'; value: boolean };

function reducer(state: FoodsListState, action: FoodsListAction): FoodsListState {
  switch (action.type) {
    case 'SET_Q': return { ...state, q: action.value };
    case 'SET_SEARCHING': return { ...state, searching: action.value };
    case 'SET_PENDING_DELETE': return { ...state, pendingDelete: action.value };
    case 'SET_DELETING': return { ...state, deleting: action.value };
    default: return state;
  }
}

export function OwnerFoodsPage() {
  const { foods, isLoading, fetch, remove } = useFoodsStore();
  const [state, dispatch] = useReducer(reducer, {
    q: '', searching: false, pendingDelete: null, deleting: false,
  });
  const { q, searching, pendingDelete, deleting } = state;

  // Debounced search
  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      if (cancelled) return;
      dispatch({ type: 'SET_SEARCHING', value: true });
      await fetch(q || undefined);
      if (!cancelled) dispatch({ type: 'SET_SEARCHING', value: false });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, fetch]);

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    dispatch({ type: 'SET_DELETING', value: true });
    try {
      await remove(pendingDelete._id);
      toast.success(`Deleted "${pendingDelete.name}"`);
      dispatch({ type: 'SET_PENDING_DELETE', value: null });
    } catch {
      toast.error('Failed to delete food');
    } finally {
      dispatch({ type: 'SET_DELETING', value: false });
    }
  }

  const subtitle = useMemo(() => {
    if (isLoading) return undefined;
    return `${foods.length} food${foods.length !== 1 ? 's' : ''}`;
  }, [foods.length, isLoading]);

  return (
    <div>
      <PageHeader
        title="My Foods"
        subtitle={subtitle}
        actions={
          <Link
            to="/owner/foods/new"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
          >
            <Plus className="size-4" />
            Create Food
          </Link>
        }
      />

      <div className="px-4 sm:px-8 py-7 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/65" />
          <Input
            placeholder="Filter by name..."
            value={q}
            onChange={(e) => dispatch({ type: 'SET_Q', value: e.target.value })}
            className="h-10 pl-9 pr-9 text-sm"
            aria-label="Filter foods by name"
          />
          {q && !searching && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_Q', value: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-foreground/65 hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              aria-label="Clear filter"
            >
              <X className="size-3.5" />
            </button>
          )}
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-foreground/65" />
          )}
        </div>

        {isLoading ? (
          <ul className="space-y-2" aria-busy="true" aria-label="Loading foods">
            {[0, 1, 2].map((i) => (
              <li key={i}>
                <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="ml-auto h-4 w-40" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : foods.length === 0 ? (
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
                  to="/owner/foods/new"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
                >
                  Create Food
                </Link>
              ) : undefined
            }
          />
        ) : (
          <m.ul
            className="space-y-1.5"
            variants={variants.staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {foods.map((f) => (
              <m.li key={f._id} variants={variants.staggerItem} className="relative group">
                <Link
                  to={`/owner/foods/${f._id}/edit`}
                  aria-label={`Edit ${f.name}`}
                  className="block rounded-lg bg-card ring-1 ring-foreground/10 px-3 py-2 pr-10 transition-colors hover:ring-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">{f.name}</span>
                      {f.brand && (
                        <span className="text-xs text-foreground/65 truncate">· {f.brand}</span>
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
                  onClick={() => dispatch({ type: 'SET_PENDING_DELETE', value: f })}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-foreground/65 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                  aria-label={`Delete ${f.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </m.li>
            ))}
          </m.ul>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o && !deleting) dispatch({ type: 'SET_PENDING_DELETE', value: null });
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
              onClick={() => dispatch({ type: 'SET_PENDING_DELETE', value: null })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
