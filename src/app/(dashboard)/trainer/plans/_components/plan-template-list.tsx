'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
}

export function PlanTemplateList({ templates, onDelete }: Props) {
  const shouldReduce = useReducedMotion();

  return (
    <div>
      <PageHeader
        title="Plan Templates"
        subtitle={`${templates.length} template${templates.length !== 1 ? 's' : ''}`}
        actions={
          <Link
            href="/trainer/plans/new"
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
                href="/trainer/plans/new"
                className="inline-flex h-8 items-center justify-center rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
              >
                New Template
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {templates.map((template, i) => (
              <motion.div
                key={template._id}
                initial={{ opacity: 0, y: shouldReduce ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduce ? 0 : i * 0.04 }}
              >
                <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 flex items-center justify-between hover:border-[#2a2a2a] transition-colors">
                  <div>
                    <div className="text-[14px] font-semibold text-white">{template.name}</div>
                    {template.description && (
                      <div className="text-[12px] text-[#555] mt-0.5">{template.description}</div>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className="bg-[#1a1a1a] text-[#555] border-0 text-[10px]">
                        {template.days.length} {template.days.length !== 1 ? 'days' : 'day'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/trainer/plans/${template._id}/edit`}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-[#333] hover:text-[#888] hover:bg-[#141414] transition-all"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Link>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(template._id)}
                        className="text-[#333] hover:text-red-400 hover:bg-[#141414]"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
