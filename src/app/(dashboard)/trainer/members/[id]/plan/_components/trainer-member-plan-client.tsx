'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        <h2 className="text-lg font-semibold mb-3">当前计划</h2>
        {activePlan ? (
          <div className="rounded-lg border p-4">
            <p className="font-medium">{activePlan.name}</p>
            <p className="text-sm text-muted-foreground mt-1">{activePlan.days.length} 天</p>
            <p className="text-xs text-muted-foreground">分配于 {new Date(activePlan.assignedAt).toLocaleDateString('zh-CN')}</p>
          </div>
        ) : (
          <p className="text-muted-foreground">未分配计划</p>
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
            <option value="">选择计划模板</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
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

      {pbs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">个人记录</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-4">动作</th>
                <th className="py-2 pr-4">最佳重量</th>
                <th className="py-2 pr-4">组次</th>
                <th className="py-2">估计1RM</th>
              </tr>
            </thead>
            <tbody>
              {pbs.map((pb) => (
                <tr key={pb.exerciseName} className="border-b">
                  <td className="py-2 pr-4">{pb.exerciseName}</td>
                  <td className="py-2 pr-4">{pb.bestWeight} kg</td>
                  <td className="py-2 pr-4">{pb.bestReps}</td>
                  <td className="py-2">{pb.estimatedOneRM.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {sessions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">训练历史</h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s._id} className="text-sm border rounded-md p-3">
                <span className="font-medium">{s.dayName}</span>
                <span className="ml-3 text-muted-foreground">
                  {new Date(s.startedAt).toLocaleDateString('zh-CN')}
                </span>
                {!s.completedAt && <span className="ml-2 text-yellow-600">进行中</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
