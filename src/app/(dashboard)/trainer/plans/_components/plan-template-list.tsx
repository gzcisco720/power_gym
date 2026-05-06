'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

interface Template {
  _id: string;
  name: string;
  description: string | null;
  days: unknown[];
}

interface Props {
  templates: Template[];
  onDelete?: (id: string) => Promise<void>;
  basePath?: string;
}

export function PlanTemplateList({ templates, onDelete, basePath = '/trainer/plans' }: Props) {
  const shouldReduce = useReducedMotion();

  return (
    <div>
      <PageHeader
        title="Plan Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? 's' : ''}`}
        actions={
          <Link
            href={`${basePath}/new`}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
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
                className="inline-flex h-8 items-center justify-center rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
              >
                New Template
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates.map((template, i) => (
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
                  className="block h-full rounded-xl border border-[#141414] bg-[#0c0c0c] p-4 pr-11 transition-colors hover:border-[#2a2a2a]"
                >
                  <div className="line-clamp-1 text-[14px] font-semibold text-white">
                    {template.name}
                  </div>
                  {template.description ? (
                    <p className="mt-1 line-clamp-2 min-h-[2.4em] text-[12px] text-[#888]">
                      {template.description}
                    </p>
                  ) : (
                    <p className="mt-1 min-h-[2.4em] text-[12px] italic text-[#444]">
                      No description
                    </p>
                  )}
                  <div className="mt-3">
                    <Badge className="border-0 bg-[#1a1a1a] text-[10px] text-[#888]">
                      {template.days.length} {template.days.length !== 1 ? 'days' : 'day'}
                    </Badge>
                  </div>
                </Link>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(template._id)}
                    className="absolute right-2 top-2 size-8 text-[#777] hover:bg-[#141414] hover:text-red-400"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
