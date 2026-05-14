import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { auth } from '@/lib/auth/auth';

export async function TrainerTodaySessions() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const scheduledRepo = new MongoScheduledSessionRepository();
  const bodyTestRepo = new MongoBodyTestRepository();
  const planRepo = new MongoMemberPlanRepository();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const todaySessions = await scheduledRepo.findByDateRange(todayStart, todayEnd, {
    trainerId: session.user.id,
  });

  if (todaySessions.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
          Today&apos;s Sessions
        </div>
        <p className="text-[11px] text-foreground/40 text-center py-3">
          No sessions scheduled today
        </p>
      </div>
    );
  }

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const enriched = await Promise.all(
    todaySessions.map(async (s) => {
      const memberId = s.memberIds[0]?.toString();
      const [latestTest, plan] = memberId
        ? await Promise.all([
            bodyTestRepo.findLatestByMember(memberId),
            planRepo.findActive(memberId),
          ])
        : [null, null];

      const testOverdue = latestTest ? new Date(latestTest.date) < thirtyDaysAgo : true;

      return {
        scheduledSession: s,
        testOverdue,
        hasPlan: !!plan,
        timeRange: `${s.startTime} – ${s.endTime}`,
      };
    }),
  );

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        Today&apos;s Sessions
      </div>
      <div className="space-y-2">
        {enriched.map(({ scheduledSession: s, testOverdue, hasPlan, timeRange }) => (
          <div
            key={s._id.toString()}
            className="rounded-lg p-3 border-l-2 bg-primary/[.07] border-primary/60"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-foreground">
                {s.memberIds.length} member{s.memberIds.length !== 1 ? 's' : ''}
              </div>
              <div className="text-[10px] text-primary-light">{timeRange}</div>
            </div>
            <div className="mt-1 flex gap-1.5 flex-wrap">
              {!hasPlan && (
                <span className="text-[9px] font-bold bg-red-500/15 text-red-400 ring-1 ring-red-500/25 rounded px-1.5 py-0.5">
                  ⚠ No plan
                </span>
              )}
              {testOverdue && (
                <span className="text-[9px] font-bold bg-primary/15 text-primary-light ring-1 ring-primary/25 rounded px-1.5 py-0.5">
                  Body test due
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
