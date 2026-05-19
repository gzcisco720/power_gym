import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import dynamic from 'next/dynamic';
const MemberBodyChartClient = dynamic(
  () => import('./member-body-chart-client').then((m) => m.MemberBodyChartClient),
  { ssr: false },
);

export async function MemberBodyChart() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const tests = await new MongoBodyTestRepository().findByMember(session.user.id);

  // findByMember returns desc by date — reverse to chronological for chart
  const points = [...tests]
    .reverse()
    .slice(-8)
    .map((t) => ({
      date: new Date(t.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      weight: parseFloat(t.weight.toFixed(1)),
      bodyFatPct: parseFloat(t.bodyFatPct.toFixed(1)),
    }));

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
        Body Composition
      </div>
      <MemberBodyChartClient points={points} />
    </div>
  );
}
