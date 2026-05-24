import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { auth } from '@/lib/auth/auth';

function relativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return 'Yesterday';
  return `${diffD}d ago`;
}

export async function TrainerPendingCheckIns() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const checkInRepo = new MongoCheckInRepository();
  const userRepo = new MongoUserRepository();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const [recentCheckIns, members] = await Promise.all([
    checkInRepo.findRecentByTrainer(session.user.id, sevenDaysAgo),
    userRepo.findAllMembers(session.user.id),
  ]);

  const memberMap = Object.fromEntries(members.map((m) => [m._id.toString(), m.name]));
  const shown = recentCheckIns.slice(0, 4);

  if (shown.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 min-h-[100px] flex flex-col">
        <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
          Pending Check-ins
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-emerald-400/70">All caught up ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
        Pending Check-ins
      </div>
      <div className="space-y-0">
        {shown.map((ci) => {
          const memberId = ci.memberId.toString();
          const memberName = memberMap[memberId] ?? 'Member';
          return (
            <div
              key={`${ci.memberId}-${ci.submittedAt.getTime()}`}
              className="flex items-center gap-2 py-2 border-b border-white/[.04] last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">{memberName}</div>
                <div className="text-[9px] text-foreground/35 mt-0.5">
                  {relativeTime(new Date(ci.submittedAt), now)}
                </div>
              </div>
              <Link
                href={`/trainer/members/${memberId}/check-ins`}
                className="text-[9px] font-bold bg-primary/15 text-primary-light ring-1 ring-primary/25 rounded px-2 py-0.5 flex-shrink-0"
              >
                Review
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
