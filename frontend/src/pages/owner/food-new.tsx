import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { FoodForm } from '@/components/nutrition/food-form';

export function OwnerFoodNewPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Create Food"
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
          mode="create"
          stickyFooter
          onSaved={() => navigate('/owner/foods')}
          onCancel={() => navigate('/owner/foods')}
        />
      </div>
    </div>
  );
}
