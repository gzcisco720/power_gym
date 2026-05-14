import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { cn } from '@/lib/utils';

export async function MemberPersonalBests() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const pbs = await new MongoPersonalBestRepository().findByMember(session.user.id);

  if (pbs.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
          Personal Bests
        </div>
        <p className="text-[11px] text-foreground/40 text-center py-2">No PRs yet — keep training!</p>
      </div>
    );
  }

  const sorted = [...pbs].sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime());
  const sevenDaysAgo = new Date(new Date().getTime() - 7 * 86400000);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        Personal Bests
      </div>
      <div className="space-y-0">
        {sorted.slice(0, 6).map((pb) => {
          const isRecent = new Date(pb.achievedAt) > sevenDaysAgo;
          return (
            <div
              key={pb._id.toString()}
              className="flex items-center justify-between py-2 border-b border-white/[.04] last:border-0"
            >
              <div>
                <div className="text-[11px] font-semibold text-foreground">{pb.exerciseName}</div>
                <div className="text-[9px] text-foreground/30 mt-0.5">
                  {new Date(pb.achievedAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-amber-400">
                  {pb.estimatedOneRM.toFixed(1)} kg
                </span>
                <span
                  className={cn(
                    'text-[9px] font-bold rounded px-1.5 py-0.5',
                    isRecent
                      ? 'bg-amber-500/[.12] text-amber-400 ring-1 ring-amber-500/[.22]'
                      : 'bg-white/[.05] text-foreground/30 ring-1 ring-white/[.07]',
                  )}
                >
                  {isRecent ? '↑ PR' : 'stable'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
