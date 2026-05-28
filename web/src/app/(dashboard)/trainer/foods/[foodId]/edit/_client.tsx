'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { FoodForm } from '@/components/nutrition/food-form';
import type { IFoodMacros, IFoodServing } from '@/lib/db/models/food.model';

export interface InitialFoodData {
  _id: string;
  name: string;
  brand: string | null;
  macrosPer100g: IFoodMacros;
  servings: IFoodServing[];
}

interface Props {
  basePath: string;
  initialFood: InitialFoodData;
}

export function FoodsEditClient({ basePath, initialFood }: Props) {
  const { push } = useRouter();

  return (
    <div>
      <PageHeader
        title="Edit Food"
        subtitle={initialFood.name}
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
          mode="edit"
          stickyFooter
          initialFood={initialFood}
          onSaved={() => push(basePath)}
          onCancel={() => push(basePath)}
        />
      </div>
    </div>
  );
}
