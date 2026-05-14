import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function greetingEmoji(): string {
  const h = new Date().getHours();
  if (h < 12) return '☀️';
  if (h < 17) return '💪';
  return '🌙';
}

export async function MemberHero() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const memberId = session.user.id;
  const sessionRepo = new MongoWorkoutSessionRepository();
  const scheduledRepo = new MongoScheduledSessionRepository();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [streak, upcomingToday] = await Promise.all([
    sessionRepo.findConsecutiveStreakDays(memberId),
    scheduledRepo.findUpcomingByMember(memberId, 5),
  ]);

  // IScheduledSession.date is a Date; startTime is a "HH:MM" string
  const todaySession = upcomingToday.find(
    (s) => new Date(s.date) >= todayStart && new Date(s.date) <= todayEnd,
  );
  const subLine = todaySession
    ? `Session at ${todaySession.startTime}`
    : 'No session scheduled today';

  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">
          {greeting()}, {session.user.firstName ?? 'there'} {greetingEmoji()}
        </h2>
        <p className="text-[11px] text-foreground/40 mt-1">{subLine}</p>
      </div>
      {streak > 0 && (
        <div className="text-right flex-shrink-0 ml-4">
          <div
            className="text-[44px] font-extrabold tracking-[-2px] leading-none"
            style={{
              background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {streak}
          </div>
          <div className="text-[9px] text-foreground/30 mt-1">day streak 🔥</div>
        </div>
      )}
    </div>
  );
}
