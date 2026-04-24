'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeader } from '@/components/shared/section-header';

interface Template { _id: string; name: string; }
interface ActivePlan { _id: string; name: string; days: { dayNumber: number; name: string; exercises: unknown[] }[]; assignedAt: string; }
interface Session { _id: string; dayName: string; startedAt: string; completedAt: string | null; }
interface PB { exerciseName: string; bestWeight: number; bestReps: number; estimatedOneRM: number; }

interface Props {
  memberId: string;
  templates: Template[];
  activePlan: ActivePlan | null;
  sessions: Session[];
  pbs: PB[];
}

export function TrainerMemberPlanClient({ memberId, templates, activePlan, sessions, pbs }: Props) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function assignPlan() {
    if (!selectedTemplate) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/members/${memberId}/plan`, {
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
        <SectionHeader title="当前计划" />
        {activePlan ? (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 mt-3">
            <p className="text-[14px] font-semibold text-white">{activePlan.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-[#1a1a1a] text-[#555] border-0 text-[10px]">
                {activePlan.days.length} 天
              </Badge>
              <span className="text-[11px] text-[#333]">
                分配于 {new Date(activePlan.assignedAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </Card>
        ) : (
          <p className="text-[13px] text-[#444] mt-3">未分配计划</p>
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
            <option value="">选择计划模板</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
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

      {pbs.length > 0 && (
        <section>
          <SectionHeader title="个人记录" />
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#141414]">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">动作</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">最佳重量</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">组次</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[1.5px] text-[#2e2e2e]">估计1RM</th>
                </tr>
              </thead>
              <tbody>
                {pbs.map((pb) => (
                  <tr key={pb.exerciseName} className="border-b border-[#0f0f0f] last:border-0">
                    <td className="px-4 py-3 text-[13px] text-white">{pb.exerciseName}</td>
                    <td className="px-4 py-3 text-[13px] text-[#888]">{pb.bestWeight} kg</td>
                    <td className="px-4 py-3 text-[13px] text-[#888]">{pb.bestReps}</td>
                    <td className="px-4 py-3 text-[13px] text-[#888]">{pb.estimatedOneRM.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {sessions.length > 0 && (
        <section>
          <SectionHeader title="训练历史" />
          <div className="space-y-2 mt-3">
            {sessions.map((s) => (
              <Card key={s._id} className="bg-[#0c0c0c] border-[#141414] rounded-xl p-3 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-white">{s.dayName}</span>
                <div className="flex items-center gap-2">
                  {!s.completedAt && (
                    <Badge className="bg-yellow-900/30 text-yellow-500 border-0 text-[10px]">进行中</Badge>
                  )}
                  <span className="text-[11px] text-[#333]">
                    {new Date(s.startedAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
