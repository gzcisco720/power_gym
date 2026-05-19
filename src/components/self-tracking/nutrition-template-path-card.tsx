'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type BasePath = '/owner/my-nutrition' | '/trainer/my-nutrition';

export interface NutritionTemplateDayType {
  name: string;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export interface NutritionTemplate {
  _id: string;
  name: string;
  dayTypes: NutritionTemplateDayType[];
}

interface Props {
  templates: NutritionTemplate[];
  basePath: BasePath;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NutritionTemplatePathCard({ templates, basePath }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(
    templates.length === 1 ? templates[0]._id : null,
  );

  if (templates.length === 0) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light mb-3">
          From Template
        </span>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4">
          <span className="text-3xl opacity-30">🥗</span>
          <p className="text-sm text-foreground/65">No templates yet.</p>
          <p className="text-xs text-foreground/65">Create a nutrition template to log structured days.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(basePath.replace('/my-nutrition', '/nutrition/new'))}
        >
          + Create Template
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-primary-light">
          From Template
        </span>
        <span className="text-[10px] uppercase tracking-[1.6px] font-bold text-foreground/65">
          Pick any day
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {templates.map((tpl) => {
          const isExpanded = expandedId === tpl._id;
          return (
            <div key={tpl._id} className="rounded-lg ring-1 ring-foreground/10 overflow-hidden">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => setExpandedId(isExpanded ? null : tpl._id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-foreground/5 transition-colors"
              >
                <div>
                  <div className="text-sm font-semibold">{tpl.name}</div>
                  <div className="text-[10px] text-foreground/65">
                    {tpl.dayTypes.length} day type{tpl.dayTypes.length === 1 ? '' : 's'}
                  </div>
                </div>
                <span className="text-foreground/40 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (
                <div className="border-t border-foreground/10 bg-foreground/[0.02] px-2 py-1.5 flex flex-col gap-1">
                  {tpl.dayTypes.map((dt) => (
                    <div
                      key={dt.name}
                      className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-foreground/5"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[12px] font-medium">{dt.name}</span>
                        <span className="text-[10px] text-foreground/65 ml-2">
                          {dt.targetKcal} kcal · P {dt.targetProtein}g · C {dt.targetCarbs}g · F {dt.targetFat}g
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() =>
                          router.push(
                            `${basePath}/day?date=${todayISO()}&templateId=${tpl._id}&dayTypeName=${encodeURIComponent(dt.name)}`,
                          )
                        }
                        className="h-6 px-2 text-[11px] shrink-0 text-primary-light hover:text-primary-light hover:bg-primary/10"
                      >
                        Log
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
