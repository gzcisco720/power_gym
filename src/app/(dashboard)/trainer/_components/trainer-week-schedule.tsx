import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { auth } from '@/lib/auth/auth';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export async function TrainerWeekSchedule() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const scheduledRepo = new MongoScheduledSessionRepository();

  const now = new Date();
  // Week starts on Monday
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const sessions = await scheduledRepo.findByDateRange(weekStart, weekEnd, {
    trainerId: session.user.id,
  });

  // Count sessions per weekday (0=Mon...6=Sun)
  const counts = new Array<number>(7).fill(0);
  for (const s of sessions) {
    const d = new Date(s.date);
    const dow = d.getDay(); // 0=Sun
    const idx = dow === 0 ? 6 : dow - 1; // convert to Mon=0
    counts[idx]++;
  }

  const maxCount = Math.max(...counts, 1);
  const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <Link href="/trainer/calendar" className="block">
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 hover:ring-white/[.14] transition-all min-h-[180px] flex flex-col">
        <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
          This Week
        </div>
        <div className="flex items-end gap-1.5 h-10 mb-2">
          {counts.map((count, i) => {
            const isToday = i === todayIdx;
            const heightPct = count === 0 ? 8 : Math.round((count / maxCount) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-sm transition-all ${
                    isToday ? 'bg-primary' : count > 0 ? 'bg-primary/40' : 'bg-white/[.06]'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className={`flex-1 text-center text-[8px] ${
                i === todayIdx ? 'text-primary-light font-bold' : 'text-foreground/30'
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="border-t border-white/[.05] pt-2 mt-auto flex justify-between">
          <div className="text-[9px] text-foreground/35">This week</div>
          <div className="text-[11px] font-bold text-primary-light">{total} sessions</div>
        </div>
      </div>
    </Link>
  );
}
