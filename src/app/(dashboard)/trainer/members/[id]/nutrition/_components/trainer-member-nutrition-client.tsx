'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/shared/section-header';

interface Template {
  _id: string;
  name: string;
}

interface ActivePlan {
  _id: string;
  name: string;
  dayTypes: { name: string }[];
  assignedAt: string;
}

interface Props {
  memberId: string;
  templates: Template[];
  activePlan: ActivePlan | null;
}

export function TrainerMemberNutritionClient({ memberId, templates, activePlan }: Props) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function assignPlan() {
    if (!selectedTemplate) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/members/${memberId}/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      if (res.ok) router.refresh();
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title="当前营养计划" />
        {activePlan ? (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 mt-3">
            <p className="text-[14px] font-semibold text-white">{activePlan.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-[#1a1a1a] text-[#555] border-0 text-[10px]">
                {activePlan.dayTypes.length} 种天类型
              </Badge>
              <span className="text-[11px] text-[#333]">
                分配于 {new Date(activePlan.assignedAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </Card>
        ) : (
          <p className="text-[13px] text-[#444] mt-3">未分配营养计划</p>
        )}
      </section>

      <section>
        <SectionHeader title="分配新计划" />
        <div className="flex gap-3 items-center mt-3">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="flex-1 rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
          >
            <option value="">选择营养计划模板</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <Button
            onClick={assignPlan}
            disabled={!selectedTemplate || assigning}
            className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
          >
            {assigning ? '分配中...' : '分配计划'}
          </Button>
        </div>
      </section>
    </div>
  );
}
