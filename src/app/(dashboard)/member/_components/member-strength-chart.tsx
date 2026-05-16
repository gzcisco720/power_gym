import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MemberStrengthChartClient } from './member-strength-chart-client';

export async function MemberStrengthChart() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const memberId = session.user.id;

  const pbs = await new MongoPersonalBestRepository().findByMember(memberId);
  const top3 = [...pbs]
    .sort((a, b) => b.estimatedOneRM - a.estimatedOneRM)
    .slice(0, 3);

  const sessionRepo = new MongoWorkoutSessionRepository();
  const histories = await Promise.all(
    top3.map((pb) =>
      sessionRepo.findExerciseHistory(memberId, String(pb.exerciseId)),
    ),
  );

  const exercises = top3.map((pb, i) => ({
    exerciseName: pb.exerciseName,
    points: (histories[i] ?? []).map((p) => ({
      date: new Date(p.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      ts: new Date(p.date).getTime(),
      oneRM: parseFloat(p.estimatedOneRM.toFixed(1)),
    })),
  }));

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
        Strength (1RM est.)
      </div>
      <MemberStrengthChartClient exercises={exercises} />
    </div>
  );
}
