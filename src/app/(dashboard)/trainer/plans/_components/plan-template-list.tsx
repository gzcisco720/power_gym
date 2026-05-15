'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

interface PlanDay {
  name: string;
  exercises: unknown[];
}

interface Template {
  _id: string;
  name: string;
  description: string | null;
  days: PlanDay[];
}

interface Props {
  templates: Template[];
  onDelete?: (id: string) => Promise<void>;
  basePath?: string;
}

const ACCENT_BORDERS = [
  'border-t-blue-400/50',
  'border-t-violet-400/50',
  'border-t-cyan-400/50',
  'border-t-indigo-400/50',
  'border-t-purple-400/50',
];

const CHIP_COLORS = [
  'bg-blue-500/10 text-blue-300 ring-blue-500/20',
  'bg-violet-500/10 text-violet-300 ring-violet-500/20',
  'bg-cyan-500/10 text-cyan-300 ring-cyan-500/20',
  'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20',
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

function PlanStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className={`text-[14px] font-semibold leading-none ${color}`}>{value}</div>
      <div className={`mt-1 text-[9px] uppercase tracking-wider ${color} opacity-50`}>{label}</div>
    </div>
  );
}

export function PlanTemplateList({ templates, onDelete, basePath = '/trainer/plans' }: Props) {
  const shouldReduce = useReducedMotion();

  return (
    <div>
      <PageHeader
        title="Training Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? 's' : ''}`}
        actions={
          <Link
            href={`${basePath}/new`}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Link>
        }
      />

      <div className="px-4 sm:px-8 py-7">
        {templates.length === 0 ? (
          <EmptyState
            heading="No templates yet"
            description="Create your first training plan template to assign to members."
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((template, i) => {
              const accent = ACCENT_BORDERS[hashIndex(template._id, ACCENT_BORDERS.length)];
              const totalExercises = template.days.reduce((sum, d) => sum + d.exercises.length, 0);
              return (
                <motion.div
                  key={template._id}
                  initial={{ opacity: 0, y: shouldReduce ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: shouldReduce ? 0 : i * 0.04 }}
                  className="relative"
                >
                  <Link
                    href={`${basePath}/${template._id}/edit`}
                    aria-label={`Edit ${template.name}`}
                    className={`block h-full rounded-xl bg-white/[.02] ring-1 ring-white/[.06] border-t-2 ${accent} p-4 pr-11 transition-all hover:ring-white/[.14]`}
                  >
                    <div className="line-clamp-1 text-[14px] font-semibold text-white">
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

                    {template.days.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {template.days.map((day, idx) => (
                          <span
                            key={`${day.name}-${idx}`}
                            className={`rounded px-1.5 py-0.5 text-[10px] ring-1 ${CHIP_COLORS[idx % CHIP_COLORS.length]}`}
                          >
                            {day.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-[10px] italic text-foreground/20">No days yet</div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-foreground/[.06] pt-3 text-center">
                      <PlanStat value={template.days.length} label="days" color="text-blue-300" />
                      <PlanStat value={totalExercises} label="exercises" color="text-violet-300" />
                    </div>
                  </Link>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(template._id)}
                      className="absolute right-2 top-2 size-8 text-foreground/25 hover:bg-white/[.05] hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
