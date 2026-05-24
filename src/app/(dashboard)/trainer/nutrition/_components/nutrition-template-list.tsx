'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { variants } from '@/lib/animations/variants';
import { Plus, Trash2, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

interface MacroAvg {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Template {
  _id: string;
  name: string;
  description: string | null;
  dayTypeNames: string[];
  avgPerDay: MacroAvg | null;
}

interface Props {
  templates: Template[];
  onDelete?: (id: string) => Promise<void>;
  basePath?: string;
}

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

function MacroStat({ value, suffix, label, color }: { value: number; suffix?: string; label: string; color: string }) {
  return (
    <div>
      <div className={`text-[14px] font-semibold leading-none ${color}`}>
        {value}
        {suffix && <span className="text-[10px] opacity-60">{suffix}</span>}
      </div>
      <div className={`mt-1 text-[9px] uppercase tracking-wider ${color} opacity-50`}>{label}</div>
    </div>
  );
}

export function NutritionTemplateList({ templates, onDelete, basePath = '/trainer/nutrition' }: Props) {
  const foodsPath = basePath.startsWith('/owner/') ? '/owner/foods' : '/trainer/foods';

  return (
    <div>
      <PageHeader
        title="Nutrition Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <Link
              href={foodsPath}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200 hover:border-emerald-500/60 transition-all"
            >
              <Apple className="size-4" />
              Foods
            </Link>
            <Link
              href={`${basePath}/new`}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              New Template
            </Link>
          </>
        }
      />

      <div className="px-4 sm:px-8 py-7">
        {templates.length === 0 ? (
          <EmptyState
            heading="No templates yet"
            description="Create your first nutrition plan template to assign to members."
            action={
              <Link
                href={`${basePath}/new`}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                New Template
              </Link>
            }
          />
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            variants={variants.staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {templates.map((template) => {
              const accent = ACCENT_BORDERS[hashIndex(template._id, ACCENT_BORDERS.length)];
              return (
                <motion.div
                  key={template._id}
                  variants={variants.staggerItem}
                  className="relative"
                >
                  <Link
                    href={`${basePath}/${template._id}/edit`}
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

                    {template.dayTypeNames.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {template.dayTypeNames.map((name, idx) => (
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

                    {template.avgPerDay && (
                      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-foreground/[.06] pt-3 text-center">
                        <MacroStat value={template.avgPerDay.kcal} label="kcal/d" color="text-orange-300" />
                        <MacroStat value={template.avgPerDay.protein} suffix="g" label="protein" color="text-rose-300" />
                        <MacroStat value={template.avgPerDay.carbs} suffix="g" label="carbs" color="text-sky-300" />
                        <MacroStat value={template.avgPerDay.fat} suffix="g" label="fat" color="text-amber-300" />
                      </div>
                    )}
                  </Link>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(template._id)}
                      className="absolute right-2 top-2 size-8 text-foreground/25 hover:bg-white/[.05] hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
