import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MemberBodyChartClient } from '@/app/(dashboard)/member/_components/member-body-chart-client';

export async function BodyCompositionSection({ memberId }: { memberId: string }) {
  await connectDB();
  const tests = await new MongoBodyTestRepository().findByMember(memberId);

  const points = [...tests]
    .reverse()
    .slice(-8)
    .map((t) => ({
      date: new Date(t.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      weight: parseFloat(t.weight.toFixed(1)),
      bodyFatPct: parseFloat(t.bodyFatPct.toFixed(1)),
    }));

  if (points.length === 0) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
          Body Composition
        </div>
        <p className="text-sm text-foreground/40">No body test data recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
        Body Composition
      </div>
      <MemberBodyChartClient points={points} />
    </div>
  );
}
