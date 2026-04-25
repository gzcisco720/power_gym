'use client';

import { useRouter } from 'next/navigation';
import { PlanTemplateForm } from '../_components/plan-template-form';
import { PageHeader } from '@/components/shared/page-header';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

export default function NewPlanPage() {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
    const res = await fetch('/api/plan-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) router.push('/trainer/plans');
  }

  return (
    <div>
      <PageHeader title="新建训练计划" />
      <div className="px-8 py-7">
        <PlanTemplateForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
