import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { auth } from '@/lib/auth/auth';

export async function TrainerTodaySessions() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const scheduledRepo = new MongoScheduledSessionRepository();
  const bodyTestRepo = new MongoBodyTestRepository();
  const planRepo = new MongoMemberPlanRepository();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const todaySessions = await scheduledRepo.findByDateRange(todayStart, todayEnd, {
    trainerId: session.user.id,
  });

  if (todaySessions.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 min-h-[220px] flex flex-col">
        <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
          Today&apos;s Sessions
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-xs text-foreground/40">No sessions scheduled today</p>

          <Link
            href="/trainer/calendar"
            className="text-[11px] font-semibold bg-primary/15 text-primary-light ring-1 ring-primary/25 rounded-lg px-4 py-2 hover:bg-primary/25 transition-colors"
          >
            View this week&apos;s schedule →
          </Link>
        </div>
      </div>
    );
  }

  const enriched = await Promise.all(
    todaySessions.map(async (s) => {
      const memberId = s.memberIds[0]?.toString();
      const [member, latestTest, plan, completedCount] = memberId
        ? await Promise.all([
            userRepo.findById(memberId),
            bodyTestRepo.findLatestByMember(memberId),
            planRepo.findActive(memberId),
            sessionRepo.countCompletedByMemberSince(memberId, todayStart),
          ])
        : [null, null, null, 0];

      const testOverdue = latestTest ? new Date(latestTest.date) < thirtyDaysAgo : true;
      const completedToday = (completedCount as number) > 0;

      // Determine session state relative to current time
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const sessionStart = new Date(now);
      sessionStart.setHours(startH, startM, 0, 0);
      const sessionEnd = new Date(now);
      sessionEnd.setHours(endH, endM, 0, 0);
      const inProgress = now >= sessionStart && now <= sessionEnd;

      return {
        id: s._id.toString(),
        memberId: memberId ?? null,
        memberName: member?.name ?? 'Member',
        planName: plan?.name ?? null,
        hasPlan: !!plan,
        testOverdue,
        completedToday,
        inProgress,
        timeRange: `${s.startTime} – ${s.endTime}`,
      };
    }),
  );

  const MAX_VISIBLE = 6;
  const shown = enriched.slice(0, MAX_VISIBLE);
  const overflow = enriched.length - MAX_VISIBLE;

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 min-h-[220px]">
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
        Today&apos;s Sessions
        <span className="ml-2 text-foreground/35 font-normal normal-case tracking-normal">
          {enriched.length} total
        </span>
      </div>
      <div className="border border-white/[.07] rounded-lg overflow-hidden">
        {shown.map(({ id, memberId, memberName, planName, hasPlan, testOverdue, completedToday, inProgress, timeRange }, i) => {
          const dotClass = completedToday
            ? 'bg-emerald-500'
            : inProgress
              ? 'bg-primary animate-pulse'
              : 'bg-white/20';

          return (
            <Link
              key={id}
              href={memberId ? `/trainer/members/${memberId}` : '#'}
              className={`flex items-center gap-2.5 px-3 py-2 hover:bg-white/[.03] transition-colors ${i < shown.length - 1 ? 'border-b border-white/[.04]' : ''} ${inProgress ? 'bg-primary/[.04]' : ''}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <span className={`text-[11px] font-bold truncate ${completedToday ? 'text-foreground/50' : 'text-foreground'}`}>
                  {memberName}
                </span>
                {planName && (
                  <span className="text-[10px] text-foreground/35 truncate hidden sm:inline">
                    · {planName}
                  </span>
                )}
                {!hasPlan && (
                  <span className="text-[9px] font-bold bg-red-500/15 text-red-400 ring-1 ring-red-500/25 rounded px-1.5 py-0.5 flex-shrink-0">
                    No plan
                  </span>
                )}
                {testOverdue && hasPlan && (
                  <span className="text-[9px] font-bold bg-primary/15 text-primary-light ring-1 ring-primary/25 rounded px-1.5 py-0.5 flex-shrink-0">
                    Body test due
                  </span>
                )}
              </div>
              <div className={`text-[10px] flex-shrink-0 ${inProgress ? 'text-primary-light font-semibold' : 'text-foreground/35'}`}>
                {timeRange}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {overflow > 0 ? (
          <Link href="/trainer/calendar" className="text-[10px] text-foreground/35 hover:text-foreground/60 transition-colors">
            +{overflow} more session{overflow !== 1 ? 's' : ''} →
          </Link>
        ) : (
          <span />
        )}
        <Link href="/trainer/calendar" className="text-[10px] text-foreground/35 hover:text-foreground/60 transition-colors">
          View in calendar →
        </Link>
      </div>
    </div>
  );
}
