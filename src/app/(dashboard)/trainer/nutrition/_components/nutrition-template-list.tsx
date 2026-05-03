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
  dayTypes: { name: string }[];
}

interface Props {
  templates: Template[];
  onDelete?: (id: string) => Promise<void>;
  basePath?: string;
}

export function NutritionTemplateList({ templates, onDelete, basePath = '/trainer/nutrition' }: Props) {
  const shouldReduce = useReducedMotion();

  return (
    <div>
      <PageHeader
        title="Nutrition Templates"
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
            description="Create your first nutrition plan template to assign to members."
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
                      <div className="text-[12px] text-[#888] mt-0.5">{template.description}</div>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className="bg-[#1a1a1a] text-[#888] border-0 text-[10px]">
                        {template.dayTypes.length} {template.dayTypes.length !== 1 ? 'day types' : 'day type'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`${basePath}/${template._id}/edit`}
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-[#777] hover:text-[#aaa] hover:bg-[#141414] transition-all"
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
                        className="text-[#777] hover:text-red-400 hover:bg-[#141414]"
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
