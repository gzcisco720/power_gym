import { Link } from 'react-router-dom';

export function MemberNutritionPage() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">My Nutrition</h1>

      <div className="space-y-3">
        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <p className="text-sm font-semibold text-foreground">My Plan</p>
          <p className="mt-1 text-xs text-foreground/65">View your assigned nutrition plan for today</p>
          <Link
            to={`/member/nutrition/day?date=${today}&mode=plan`}
            className="mt-2 inline-block text-xs text-primary hover:underline"
          >
            View today →
          </Link>
        </div>

        <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <p className="text-sm font-semibold text-foreground">Freestyle</p>
          <p className="mt-1 text-xs text-foreground/65">Log your food freely without a plan</p>
          <Link
            to={`/member/nutrition/day?date=${today}&mode=free`}
            className="mt-2 inline-block text-xs text-primary hover:underline"
          >
            Log today →
          </Link>
        </div>
      </div>
    </div>
  );
}
