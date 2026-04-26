'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PlanTemplateForm } from '../../_components/plan-template-form';
import { PageHeader } from '@/components/shared/page-header';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

interface Template {
  _id: string;
  name: string;
  description: string | null;
  days: IPlanDay[];
}

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [id, setId] = useState('');

  useEffect(() => {
    params.then(({ id: resolvedId }) => {
      setId(resolvedId);
      fetch(`/api/plan-templates/${resolvedId}`)
        .then((r) => r.json())
        .then((data: Template) => setTemplate(data));
    });
  }, [params]);

  async function handleSubmit(data: { name: string; description: string | null; days: IPlanDay[] }) {
    const res = await fetch(`/api/plan-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? 'Failed to save plan');
      return;
    }
    toast.success('Plan saved');
    router.push('/trainer/plans');
  }

  if (!template) return <p className="px-8 py-7 text-[#444] text-sm">加载中...</p>;

  return (
    <div>
      <PageHeader title="编辑训练计划" />
      <div className="px-8 py-7">
        <PlanTemplateForm initialData={template} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
