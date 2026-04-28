'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/shared/section-header';
import { PageHeader } from '@/components/shared/page-header';

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
  memberName?: string;
  templates: Template[];
  activePlan: ActivePlan | null;
}

export function TrainerMemberNutritionClient({ memberId, memberName, templates, activePlan }: Props) {
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
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to assign nutrition plan');
        return;
      }
      toast.success('Nutrition plan assigned');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={memberName ? `${memberName}'s Nutrition Plan` : 'Nutrition Plan'} />

      <section className="px-4 sm:px-8">
        <SectionHeader title="Current Plan" />
        {activePlan ? (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 mt-3">
            <p className="text-[14px] font-semibold text-white">{activePlan.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-[#1a1a1a] text-[#888] border-0 text-[10px]">
                {activePlan.dayTypes.length} {activePlan.dayTypes.length !== 1 ? 'day types' : 'day type'}
              </Badge>
              <span className="text-[11px] text-[#777]">
                Assigned {new Date(activePlan.assignedAt).toLocaleDateString('en-US')}
              </span>
            </div>
          </Card>
        ) : (
          <p className="text-[13px] text-[#888] mt-3">No nutrition plan assigned</p>
        )}
      </section>

      <section className="px-4 sm:px-8">
        <SectionHeader title="Assign Plan" />
        <div className="flex gap-3 items-center mt-3">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="flex-1 rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
          >
            <option value="" disabled>Select a nutrition template</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </select>
          <Button
            onClick={assignPlan}
            disabled={!selectedTemplate || assigning}
            className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </div>
      </section>
    </div>
  );
}
