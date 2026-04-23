'use client';

import { useRouter } from 'next/navigation';
import { PlanTemplateForm } from '../_components/plan-template-form';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

export default function NewPlanPage() {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
    const res = await fetch('/api/plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) router.push('/dashboard/trainer/plans');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">新建训练计划</h1>
      <PlanTemplateForm onSubmit={handleSubmit} />
    </div>
  );
}
