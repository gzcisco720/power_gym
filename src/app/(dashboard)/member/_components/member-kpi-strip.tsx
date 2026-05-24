import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { buildKpiData } from './member-kpi-strip.utils';

export async function MemberKpiStrip() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const memberId = session.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [tests, pbs, sessionsThisMonth] = await Promise.all([
    new MongoBodyTestRepository().findByMember(memberId),
    new MongoPersonalBestRepository().findByMember(memberId),
    new MongoWorkoutSessionRepository().countCompletedByMemberSince(memberId, monthStart),
  ]);

  const latest = tests[0] ?? null;
  const previous = tests[1] ?? null;
  const topPb =
    pbs.length > 0 ? pbs.reduce((best, pb) => pb.estimatedOneRM > best.estimatedOneRM ? pb : best) : null;

  const kpi = buildKpiData({ sessionsThisMonth, latest, previous, topPb, now });

  return (
    <div className="grid grid-cols-4 ring-1 ring-foreground/[.06] rounded-xl overflow-hidden mx-4 sm:mx-8 mb-4">
      <KpiCell
        value={String(kpi.sessionsThisMonth)}
        label="Sessions"
        delta="this month"
        valueClass="text-primary-light"
      />
      <KpiCell
        value={kpi.weightKg}
        label="Weight kg"
        delta={
          kpi.weightDelta !== null
            ? `${kpi.weightDelta < 0 ? '↓' : '↑'} ${Math.abs(kpi.weightDelta).toFixed(1)} vs last`
            : undefined
        }
        deltaClass={kpi.weightImproved ? 'text-emerald-400' : undefined}
      />
      <KpiCell
        value={kpi.bfPct}
        label="Body Fat %"
        delta={
          kpi.bfDelta !== null
            ? `${kpi.bfDelta < 0 ? '↓' : '↑'} ${Math.abs(kpi.bfDelta).toFixed(1)}%`
            : undefined
        }
        valueClass={kpi.bfImproved ? 'text-emerald-400' : undefined}
        deltaClass={kpi.bfImproved ? 'text-emerald-400' : undefined}
      />
      <KpiCell
        value={kpi.topPrKg}
        label={kpi.topPrName}
        delta={kpi.isNewPr ? '↑ New PR' : undefined}
        valueClass="text-amber-400"
        deltaClass={kpi.isNewPr ? 'text-amber-400' : undefined}
      />
    </div>
  );
}

function KpiCell({
  value,
  label,
  delta,
  valueClass,
  deltaClass,
}: {
  value: string;
  label: string;
  delta?: string;
  valueClass?: string;
  deltaClass?: string;
}) {
  return (
    <div className="bg-white/[.02] px-2 py-3 text-center border-r border-foreground/[.05] last:border-0">
      <div className={`text-[18px] font-extrabold leading-tight ${valueClass ?? 'text-foreground'}`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-[.06em] text-foreground/65 mt-0.5">{label}</div>
      {delta && (
        <div className={`text-[9px] mt-0.5 ${deltaClass ?? 'text-foreground/65'}`}>{delta}</div>
      )}
    </div>
  );
}
