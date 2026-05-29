import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useBodyTestsStore } from '@/stores/bodyTestsStore';

export function MemberBodyTestsPage() {
  const user = useAuthStore((s) => s.user);
  const { testsByMember, fetchTests } = useBodyTestsStore();

  const memberId = user?.id ?? '';
  const tests = testsByMember[memberId] ?? [];

  useEffect(() => {
    if (memberId && !(memberId in testsByMember)) void fetchTests(memberId);
  }, [memberId, testsByMember, fetchTests]);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Body Composition Tests</h1>

      <div className="space-y-2">
        {tests.map((t) => (
          <div key={t._id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{t.protocol.toUpperCase()}</p>
              <p className="text-xs text-foreground/65">{t.date.slice(0, 10)}</p>
            </div>
            <p className="mt-1 text-xs text-foreground/65">Body fat: {t.bodyFatPct.toFixed(1)}%</p>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="text-sm text-foreground/65">No tests recorded yet.</p>
        )}
      </div>
    </div>
  );
}
