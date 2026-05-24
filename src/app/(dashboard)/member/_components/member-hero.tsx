import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MemberHeroClient } from './member-hero-client';
import { estimatedDuration } from './member-hero.utils';

function greetingText(firstName: string): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const emoji = h < 12 ? '☀️' : h < 17 ? '💪' : '🌙';
  return `${salutation}, ${firstName} ${emoji}`;
}

export async function MemberHero() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const memberId = session.user.id;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [streak, upcoming, plan] = await Promise.all([
    new MongoWorkoutSessionRepository().findConsecutiveStreakDays(memberId),
    new MongoScheduledSessionRepository().findUpcomingByMember(memberId, 5),
    new MongoMemberPlanRepository().findActive(memberId),
  ]);

  const todaySession = upcoming.find((s) => {
    const d = new Date(s.date);
    return d >= todayStart && d <= todayEnd;
  });

  const day = plan?.days[0] ?? null;
  const totalSets = day ? day.exercises.reduce((sum, e) => sum + e.sets, 0) : 0;
  const shown = day ? day.exercises.slice(0, 5) : [];
  const overflow = day ? Math.max(0, day.exercises.length - shown.length) : 0;
  const duration = day ? estimatedDuration(totalSets) : 0;

  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[.18] via-primary/[.07] to-transparent pointer-events-none" />
      <div className="absolute -top-16 -right-16 size-56 rounded-full bg-primary/[.12] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 size-36 rounded-full bg-amber-500/[.06] blur-2xl pointer-events-none" />

      <div className="relative px-4 sm:px-8 py-6 border-b border-primary/[.12]">
        <div className="flex items-start justify-between mb-5">
          <MemberHeroClient
            greeting={greetingText(session.user.firstName ?? 'there')}
            dateLabel={dateLabel}
          />
          {streak > 0 && (
            <div className="flex-shrink-0 ml-4 flex flex-col items-center bg-amber-500/[.1] ring-1 ring-amber-500/[.2] rounded-2xl px-4 py-2.5 min-w-[72px]">
              {/* oxlint-disable-next-line react-doctor/no-gradient-text */}
              <div
                className="text-[38px] font-black leading-none"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f97316)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {streak}
              </div>
              <div className="text-[9px] text-foreground/65 uppercase tracking-[.07em] mt-0.5">
                day streak 🔥
              </div>
            </div>
          )}
        </div>

        {day ? (
          <div className="bg-primary/[.13] ring-1 ring-primary/[.28] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[.08em] text-primary-light mb-1">
                {todaySession ? `Session at ${todaySession.startTime} · ` : ''}
                {day.name}
              </div>
              <div className="text-[16px] font-bold text-foreground truncate">
                {plan?.name ?? "Today's Workout"}
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {shown.map((e) => (
                  <span
                    key={e.exerciseName}
                    className="text-[9px] bg-white/[.06] text-foreground/65 ring-1 ring-white/[.08] rounded px-2 py-0.5"
                  >
                    {e.exerciseName}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="text-[9px] bg-white/[.06] text-foreground/65 ring-1 ring-white/[.08] rounded px-2 py-0.5">
                    +{overflow} more
                  </span>
                )}
              </div>
              <div className="text-[11px] text-foreground/65 mt-2">
                {day.exercises.length} exercises · {totalSets} sets · ~{duration} min
              </div>
            </div>
            <Link
              href="/member/plan"
              aria-label="Start today's workout"
              className="flex-shrink-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[13px] font-bold rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity shadow-lg shadow-primary/[.25]"
            >
              Start →
            </Link>
          </div>
        ) : (
          <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-2xl p-4 text-center">
            <p className="text-[12px] text-foreground/65">
              Your trainer hasn&apos;t assigned a plan yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
