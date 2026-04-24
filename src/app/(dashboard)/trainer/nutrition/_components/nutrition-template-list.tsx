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
}

export function NutritionTemplateList({ templates, onDelete }: Props) {
  const shouldReduce = useReducedMotion();

  return (
    <div>
      <PageHeader
        title="营养计划模板"
        subtitle={`${templates.length} 个模板`}
        actions={
          <Button asChild className="bg-white text-black hover:bg-white/90 font-semibold">
            <Link href="/dashboard/trainer/nutrition/new">
              <Plus className="h-4 w-4 mr-1.5" />
              新建营养计划
            </Link>
          </Button>
        }
      />

      <div className="px-8 py-7">
        {templates.length === 0 ? (
          <EmptyState
            heading="还没有营养计划"
            description="创建你的第一个营养计划模板，分配给会员使用。"
            action={
              <Button asChild className="bg-white text-black hover:bg-white/90 font-semibold">
                <Link href="/dashboard/trainer/nutrition/new">新建营养计划</Link>
              </Button>
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
                        {template.dayTypes.length} 种天类型
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="text-[#333] hover:text-[#888] hover:bg-[#141414]"
                    >
                      <Link href={`/dashboard/trainer/nutrition/${template._id}/edit`}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">编辑</span>
                      </Link>
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(template._id)}
                        className="text-[#333] hover:text-red-400 hover:bg-[#141414]"
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">删除</span>
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
