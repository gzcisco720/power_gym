import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { FoodForm } from '@/components/nutrition/food-form';
import { useFoodsStore } from '@/stores/foodsStore';
import { Skeleton } from '@/components/ui/skeleton';

export function OwnerFoodEditPage() {
  const { foodId } = useParams<{ foodId: string }>();
  const navigate = useNavigate();
  const { currentFood, isLoading, fetchOne } = useFoodsStore();

  useEffect(() => {
    if (foodId) fetchOne(foodId);
  }, [foodId, fetchOne]);

  if (isLoading || !currentFood) {
    return (
      <div>
        <PageHeader title="Edit Food" />
        <div className="px-4 sm:px-8 py-7 max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit Food"
        subtitle={currentFood.name}
        actions={
          <Link
            to="/owner/foods"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-foreground/20 bg-transparent px-2.5 text-xs font-medium text-foreground/65 hover:text-foreground hover:bg-muted transition-colors"
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
          initialFood={currentFood}
          onSaved={() => navigate('/owner/foods')}
          onCancel={() => navigate('/owner/foods')}
        />
      </div>
    </div>
  );
}
