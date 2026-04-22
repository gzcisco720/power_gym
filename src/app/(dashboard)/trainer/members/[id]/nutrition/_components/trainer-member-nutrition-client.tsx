'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        <h2 className="text-lg font-semibold mb-3">当前营养计划</h2>
        {activePlan ? (
          <div className="rounded-lg border p-4">
            <p className="font-medium">{activePlan.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{activePlan.dayTypes.length} 种天类型</p>
            <p className="text-xs text-muted-foreground">
              分配于 {new Date(activePlan.assignedAt).toLocaleDateString('zh-CN')}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">未分配营养计划</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">分配新计划</h2>
        <div className="flex gap-3 items-center">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">选择营养计划模板</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={assignPlan}
            disabled={!selectedTemplate || assigning}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {assigning ? '分配中...' : '分配计划'}
          </button>
        </div>
      </section>
    </div>
  );
}
