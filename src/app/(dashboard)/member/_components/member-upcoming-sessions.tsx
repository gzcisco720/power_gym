import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { cn } from '@/lib/utils';

export async function MemberUpcomingSessions() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const sessions = await new MongoScheduledSessionRepository().findUpcomingByMember(session.user.id, 3);

  if (sessions.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/65 font-semibold mb-3">
          Upcoming Sessions
        </div>
        <p className="text-[11px] text-foreground/65 text-center py-2">No sessions scheduled</p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/65 font-semibold mb-3">
        Upcoming Sessions
      </div>
      <div className="space-y-0">
        {sessions.map((s) => {
          // s.date is a Date object
          const sessionDate = new Date(s.date);
          sessionDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((sessionDate.getTime() - today.getTime()) / 86400000);
          const isToday = diffDays === 0;
          const badge = isToday ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays} days`;
          const badgeClass = isToday
            ? 'bg-primary/15 text-primary ring-1 ring-primary/25'
            : diffDays <= 2
              ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25'
              : 'bg-white/[.05] text-foreground/65 ring-1 ring-white/[.08]';

          const dayLabel = sessionDate.toLocaleDateString('en-GB', { weekday: 'short' });
          const timeLabel = `${dayLabel} ${s.startTime}`;

          return (
            <div
              key={String(s._id)}
              className="flex items-center gap-3 py-2.5 border-b border-white/[.04] last:border-0"
            >
              <div className="text-[10px] font-bold text-primary-light min-w-[60px]">{timeLabel}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">
                  {s.memberIds.length > 1 ? `Group (${s.memberIds.length})` : 'Training session'}
                </div>
              </div>
              <span className={cn('text-[9px] font-bold rounded px-2 py-0.5 flex-shrink-0', badgeClass)}>
                {badge}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
