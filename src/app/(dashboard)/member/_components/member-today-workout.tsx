import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export async function MemberTodayWorkout() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(session.user.id);

  if (!plan) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 mb-4">
        <p className="text-[11px] text-foreground/40 text-center py-2">
          No training plan assigned yet — ask your trainer
        </p>
      </div>
    );
  }

  const day = plan.days[0];
  if (!day) return null;

  const exerciseNames = day.exercises.map((e) => e.exerciseName);
  const shown = exerciseNames.slice(0, 5);
  const overflow = exerciseNames.length - shown.length;
  const totalSets = day.exercises.reduce((sum, e) => sum + e.sets, 0);

  return (
    <div className="bg-primary/[.09] ring-1 ring-primary/25 rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[18px] font-extrabold tracking-tight text-foreground">{day.name}</div>
          <div className="text-[10px] text-foreground/40 mt-1">
            {day.exercises.length} exercises · {totalSets} sets
          </div>
        </div>
        <Link
          href="/member/plan"
          className="bg-primary/30 ring-1 ring-primary/50 text-primary text-[11px] font-bold rounded-lg px-3 py-1.5 hover:bg-primary/40 transition-colors flex-shrink-0"
        >
          Start →
        </Link>
      </div>
      <div className="flex gap-1.5 flex-wrap mt-3">
        {shown.map((name) => (
          <span
            key={name}
            className="text-[9px] bg-white/[.06] text-foreground/50 ring-1 ring-white/[.08] rounded px-2 py-0.5"
          >
            {name}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-[9px] bg-white/[.06] text-foreground/40 ring-1 ring-white/[.08] rounded px-2 py-0.5">
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  );
}
