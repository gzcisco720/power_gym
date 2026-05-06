'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { FoodCreateForm } from '@/components/nutrition/food-create-form';

interface Props {
  basePath: string;
}

export function FoodsCreateClient({ basePath }: Props) {
  const router = useRouter();

  return (
    <div>
      <PageHeader title="Create Food" />
      <div className="px-4 sm:px-8 py-7 max-w-2xl">
        <FoodCreateForm
          onCreated={() => router.push(basePath)}
          onCancel={() => router.push(basePath)}
        />
      </div>
    </div>
  );
}
