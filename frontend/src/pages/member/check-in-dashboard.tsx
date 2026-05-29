import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCheckInsStore } from '@/stores/checkInsStore';
import { Button } from '@/components/ui/button';

export function MemberCheckInDashboardPage() {
  const { checkIns, fetchCheckIns } = useCheckInsStore();

  useEffect(() => {
    if (checkIns.length === 0) void fetchCheckIns();
  }, [checkIns.length, fetchCheckIns]);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Check-Ins</h1>
        <Link to="/member/check-in/new">
          <Button size="sm">Submit Check-In</Button>
        </Link>
      </div>

      <div className="space-y-2">
        {checkIns.map((ci) => (
          <div key={ci._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Week of {ci.weekStart.slice(0, 10)}
              </p>
              <p className="text-xs text-foreground/65">{ci.submittedAt.slice(0, 10)}</p>
            </div>
            <p className="mt-1 text-xs text-foreground/65">
              Sleep: {ci.sleepQuality}/10 · Energy: {ci.energy}/10 · Recovery: {ci.recovery}/10
            </p>
          </div>
        ))}
        {checkIns.length === 0 && (
          <p className="text-sm text-foreground/65">No check-ins yet.</p>
        )}
      </div>
    </div>
  );
}
