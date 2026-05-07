'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { NutritionTemplateForm } from '@/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form';
import { PageHeader } from '@/components/shared/page-header';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

interface Props {
  id: string;
  initialData: { name: string; description: string | null; dayTypes: IDayType[] };
}

export function OwnerEditNutritionTemplateClient({ id, initialData }: Props) {
  const router = useRouter();

  async function handleSubmit(data: { name: string; description: string | null; dayTypes: IDayType[] }) {
    const res = await fetch(`/api/nutrition-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      toast.error(body.error ?? 'Failed to save nutrition plan');
      return;
    }
    toast.success('Nutrition plan saved');
    router.push('/owner/nutrition-templates');
  }

  return (
    <div>
      <PageHeader title="Edit Nutrition Plan" />
      <div className="px-4 sm:px-8 py-7">
        <NutritionTemplateForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/owner/nutrition-templates')}
        />
      </div>
    </div>
  );
}
