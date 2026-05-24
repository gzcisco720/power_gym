'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { FoodForm } from '@/components/nutrition/food-form';

interface Props {
  basePath: string;
}

export function FoodsCreateClient({ basePath }: Props) {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Create Food"
        actions={
          <Link
            href={basePath}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-transparent px-2.5 text-xs font-medium text-foreground/65 hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back
          </Link>
        }
      />
      <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto">
        <FoodForm
          mode="create"
          stickyFooter
          onSaved={() => router.push(basePath)}
          onCancel={() => router.push(basePath)}
        />
      </div>
    </div>
  );
}
