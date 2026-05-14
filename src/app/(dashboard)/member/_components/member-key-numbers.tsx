import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function MemberKeyNumbers() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const [tests, pbs] = await Promise.all([
    new MongoBodyTestRepository().findByMember(session.user.id),
    new MongoPersonalBestRepository().findByMember(session.user.id),
  ]);

  const latest = tests[0] ?? null;
  const previous = tests[1] ?? null;

  const weightDelta =
    latest && previous ? (latest.weight - previous.weight).toFixed(1) : null;
  const bfDelta =
    latest && previous ? (latest.bodyFatPct - previous.bodyFatPct).toFixed(1) : null;

  const topPb =
    [...pbs].sort((a, b) => b.estimatedOneRM - a.estimatedOneRM)[0] ?? null;
  const sevenDaysAgo = new Date(new Date().getTime() - 7 * 86400000);
  const isNewPr = topPb ? new Date(topPb.achievedAt) > sevenDaysAgo : false;

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <StatCard
        label="Weight"
        value={latest ? `${latest.weight.toFixed(1)}` : '—'}
        unit={latest ? 'kg' : undefined}
        accentColor={weightDelta && parseFloat(weightDelta) < 0 ? 'success' : undefined}
        delta={
          weightDelta
            ? `${parseFloat(weightDelta) < 0 ? '↓' : '↑'} ${Math.abs(parseFloat(weightDelta))} vs last`
            : 'No test yet'
        }
      />
      <StatCard
        label="Body Fat"
        value={latest ? `${latest.bodyFatPct.toFixed(1)}` : '—'}
        unit={latest ? '%' : undefined}
        accentColor={bfDelta && parseFloat(bfDelta) < 0 ? 'success' : undefined}
        delta={
          bfDelta
            ? `${parseFloat(bfDelta) < 0 ? '↓' : '↑'} ${Math.abs(parseFloat(bfDelta)).toFixed(1)}% vs last`
            : 'No test yet'
        }
      />
      <StatCard
        label={topPb ? topPb.exerciseName : 'Top PR'}
        value={topPb ? `${topPb.estimatedOneRM.toFixed(1)}` : '—'}
        unit={topPb ? 'kg' : undefined}
        accentColor={isNewPr ? 'achievement' : undefined}
        delta={
          isNewPr
            ? '↑ New PR this week'
            : topPb
              ? `Set ${new Date(topPb.achievedAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`
              : 'No PRs yet'
        }
      />
    </div>
  );
}
