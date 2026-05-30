import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { auth } from '@/lib/auth/auth';

const MAX_VISIBLE = 5;

export async function TrainerRecentPrs() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const members = await new MongoUserRepository().findAllMembers(session.user.id);
  const memberIds = members.map(m => m._id.toString());

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const prs =
    memberIds.length > 0
      ? await new MongoPersonalBestRepository().findByMemberIdsSince(memberIds, sevenDaysAgo)
      : [];

  const memberMap = Object.fromEntries(members.map(m => [m._id.toString(), m.name]));
  const shown = prs.slice(0, MAX_VISIBLE);
  const overflow = prs.length - MAX_VISIBLE;

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 flex flex-col min-h-[180px]">
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
        Recent PRs: This Week
      </div>
      {prs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <p className="text-xs text-foreground/40">No new PRs this week</p>
        </div>
      ) : (
        <>
          <div className="space-y-0 flex-1">
            {shown.map(pr => (
              <div key={pr._id.toString()} className="flex items-center justify-between py-2 border-b border-white/[.04] last:border-0">
                <div>
                  <div className="text-[11px] font-bold text-foreground">{memberMap[pr.memberId.toString()] ?? 'Member'}</div>
                  <div className="text-[9px] text-foreground/35 mt-0.5">{pr.exerciseName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold text-amber-400">{pr.estimatedOneRM.toFixed(1)} kg</div>
                  <div className="text-[9px] font-bold bg-amber-500/[.12] text-amber-400 ring-1 ring-amber-500/[.22] rounded px-1.5 py-0.5 mt-0.5">↑ PR</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-white/[.04]">
            <span className="text-[10px] text-foreground/35">
              {overflow > 0
                ? `+${overflow} more PR${overflow !== 1 ? 's' : ''} this week`
                : `${prs.length} PR${prs.length !== 1 ? 's' : ''} this week`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
