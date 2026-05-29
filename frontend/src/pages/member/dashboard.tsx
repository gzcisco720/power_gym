import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function MemberDashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Welcome{user?.name ? `, ${user.name}` : ''}
      </h1>
      <p className="mb-8 text-sm text-foreground/65">Here's your overview</p>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/member/my-training"
          className="rounded-xl bg-card px-5 py-3 text-sm font-medium text-foreground ring-1 ring-foreground/10 hover:ring-foreground/25"
        >
          My Training
        </Link>
        <Link
          to="/member/nutrition"
          className="rounded-xl bg-card px-5 py-3 text-sm font-medium text-foreground ring-1 ring-foreground/10 hover:ring-foreground/25"
        >
          Nutrition
        </Link>
        <Link
          to="/member/check-in"
          className="rounded-xl bg-card px-5 py-3 text-sm font-medium text-foreground ring-1 ring-foreground/10 hover:ring-foreground/25"
        >
          Check-In
        </Link>
        <Link
          to="/member/journey"
          className="rounded-xl bg-card px-5 py-3 text-sm font-medium text-foreground ring-1 ring-foreground/10 hover:ring-foreground/25"
        >
          Journey
        </Link>
      </div>
    </div>
  );
}
