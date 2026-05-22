import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { auth } from '@/lib/auth/auth';

export async function TrainerMyTrainingCard() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const selfRepo = new MongoSelfWorkoutLogRepository();

  const userId = session.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);

  const [recent, logs90d, sessionsThisMonth] = await Promise.all([
    selfRepo.findRecent(userId, 1),
    selfRepo.findByUserDateRange(userId, ninetyDaysAgo, now),
    selfRepo.findByUserDateRange(userId, startOfMonth, now).then(r => r.length),
  ]);

  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const daySet = new Set(
    logs90d.filter(l => l.completedAt).map(l => key(new Date(l.completedAt!))),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  if (!daySet.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (daySet.has(key(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const last = recent[0];
  const lastLabel = last
    ? (() => {
        const d = new Date(last.completedAt ?? last.startedAt);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
        return diffDays === 0 ? 'today' : diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
      })()
    : null;

  const heatmapSet = new Set(
    logs90d
      .filter(l => l.completedAt && new Date(l.completedAt) >= fourteenDaysAgo)
      .map(l => key(new Date(l.completedAt!))),
  );

  const dots = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return { active: heatmapSet.has(key(d)), isToday: i === 13 };
  });

  return (
    <Link href="/trainer/my-training" className="block">
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 hover:ring-white/[.14] transition-all min-h-[180px] flex flex-col">
        <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">My Training</div>
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className="text-4xl font-extrabold tracking-tighter bg-gradient-to-br from-amber-400 to-red-500 bg-clip-text text-transparent"
          >
            {streak}
          </span>
          <span className="text-[11px] text-foreground/35">day streak 🔥</span>
        </div>
        {lastLabel && (
          <div className="text-[9px] text-foreground/30 mb-3">
            Last: {last?.dayName ?? 'session'} · {lastLabel}
          </div>
        )}
        <div className="flex gap-1 flex-wrap mb-3">
          {dots.map((dot, i) => (
            <div
              key={i}
              className={`w-[10px] h-[10px] rounded-[2px] ${
                dot.active
                  ? dot.isToday
                    ? 'bg-primary'
                    : 'bg-primary/[.55]'
                  : 'bg-white/[.04]'
              }`}
            />
          ))}
        </div>
        <div className="border-t border-white/[.05] pt-3 flex justify-between mt-auto">
          <div className="text-[9px] text-foreground/35">This month</div>
          <div className="text-[12px] font-bold text-primary-light">{sessionsThisMonth} sessions</div>
        </div>
      </div>
    </Link>
  );
}
