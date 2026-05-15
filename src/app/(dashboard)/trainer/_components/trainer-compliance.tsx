import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { auth } from '@/lib/auth/auth';

export async function TrainerCompliance() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const members = await new MongoUserRepository().findAllMembers(session.user.id);
  if (members.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Member Compliance — 30 days</div>
        <p className="text-[11px] text-foreground/40 text-center py-3">No members yet</p>
      </div>
    );
  }

  const sessionRepo = new MongoWorkoutSessionRepository();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const rows = await Promise.all(
    members.map(async m => {
      const count = await sessionRepo.countCompletedByMemberSince(m._id.toString(), thirtyDaysAgo);
      const pct = Math.min(Math.round((count / 12) * 100), 100);
      return { name: m.name, pct };
    }),
  );
  rows.sort((a, b) => b.pct - a.pct);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">Member Compliance — 30 days</div>
      <div className="space-y-3">
        {rows.map(({ name, pct }) => {
          const barClass = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-destructive';
          const txtClass = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-destructive';
          return (
            <div key={name} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">{name}</div>
                <div className="mt-1 h-[3px] bg-white/[.06] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className={`text-[12px] font-bold flex-shrink-0 ${txtClass}`}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
