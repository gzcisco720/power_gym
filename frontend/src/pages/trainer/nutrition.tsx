import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { Plus, Trash2, Apple } from 'lucide-react';
import { toast } from 'sonner';
import { useNutritionStore } from '@/stores/nutritionStore';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { averagePerDay } from '@/lib/nutrition/macro-totals';
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

const ACCENT_BORDERS = [
  'border-t-emerald-400/50',
  'border-t-violet-400/50',
  'border-t-sky-400/50',
  'border-t-amber-400/50',
  'border-t-rose-400/50',
];

const CHIP_COLORS = [
  'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
  'bg-violet-500/10 text-violet-300 ring-violet-500/20',
  'bg-sky-500/10 text-sky-300 ring-sky-500/20',
  'bg-amber-500/10 text-amber-300 ring-amber-500/20',
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

export function TrainerNutritionPage() {
  const { templates, fetchTemplates, deleteTemplate, isLoading } = useNutritionStore();
  const shouldReduce = useReducedMotion();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  async function handleDeleteConfirm() {
    if (!confirmId) return;
    try {
      await deleteTemplate(confirmId);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setConfirmId(null);
    }
  }

  return (
    <LazyMotion features={domAnimation}>
      <div>
        <PageHeader
          title="Nutrition Templates"
          subtitle={isLoading ? undefined : `${templates.length} template${templates.length !== 1 ? 's' : ''}`}
          actions={
            <>
              <Link
                to="/trainer/foods"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 hover:border-emerald-500/60 transition-all"
              >
                <Apple className="size-4" />
                Foods
              </Link>
              <Link
                to="/trainer/nutrition/new"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-4" />
                New Template
              </Link>
            </>
          }
        />

        <div className="px-4 sm:px-8 py-7">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              heading="No templates yet"
              description="Create your first nutrition plan template to assign to members."
              action={
                <Link
                  to="/trainer/nutrition/new"
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  New Template
                </Link>
              }
            />
          ) : (
            <m.div
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            >
              {templates.map((template) => {
                const accent = ACCENT_BORDERS[hashIndex(template._id, ACCENT_BORDERS.length)];
                const dayTypeNames = template.dayTypes?.map((d) => d.name) ?? [];
                return (
                  <m.div
                    key={template._id}
                    variants={{ hidden: { opacity: 0, y: shouldReduce ? 0 : 10 }, visible: { opacity: 1, y: 0 } }}
                    className="relative"
                  >
                    <Link
                      to={`/trainer/nutrition/${template._id}/edit`}
                      aria-label={`Edit ${template.name}`}
                      className={`block h-full rounded-xl bg-white/[.02] ring-1 ring-white/[.06] border-t-2 ${accent} p-4 pr-11 transition-all hover:ring-white/[.14]`}
                    >
                      <div className="line-clamp-1 text-[14px] font-semibold text-foreground/85">
                        {template.name}
                      </div>
                      {template.description ? (
                        <p className="mt-1 line-clamp-2 min-h-[2.4em] text-[12px] text-foreground/45">
                          {template.description}
                        </p>
                      ) : (
                        <p className="mt-1 min-h-[2.4em] text-[12px] italic text-foreground/20">
                          No description
                        </p>
                      )}

                      {dayTypeNames.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {dayTypeNames.map((name, idx) => (
                            <span
                              key={`${name}-${idx}`}
                              className={`rounded px-1.5 py-0.5 text-[10px] ring-1 ${CHIP_COLORS[idx % CHIP_COLORS.length]}`}
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-[10px] italic text-foreground/20">No day types yet</div>
                      )}
                      {(() => {
                        const avg = averagePerDay(template);
                        if (!avg) return null;
                        return (
                          <div className="mt-3 flex items-center gap-3 text-[11px] tabular-nums">
                            <span>
                              <span className="text-orange-300 font-semibold">{avg.kcal}</span>
                              <span className="text-foreground/50"> kcal/d</span>
                            </span>
                            <span>
                              <span className="text-rose-300 font-semibold">{avg.protein}</span>
                              <span className="text-foreground/50">g</span>
                              <span className="text-foreground/40"> P</span>
                            </span>
                            <span>
                              <span className="text-sky-300 font-semibold">{avg.carbs}</span>
                              <span className="text-foreground/50">g</span>
                              <span className="text-foreground/40"> C</span>
                            </span>
                            <span>
                              <span className="text-amber-300 font-semibold">{avg.fat}</span>
                              <span className="text-foreground/50">g</span>
                              <span className="text-foreground/40"> F</span>
                            </span>
                          </div>
                        );
                      })()}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmId(template._id)}
                      className="absolute right-2 top-2 size-8 text-foreground/25 hover:bg-white/[.05] hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </m.div>
                );
              })}
            </m.div>
          )}
        </div>
      </div>
      <AlertDialog open={confirmId !== null} onOpenChange={(open) => { if (!open) setConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
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
