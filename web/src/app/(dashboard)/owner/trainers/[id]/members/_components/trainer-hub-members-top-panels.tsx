import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';

interface Props { trainerId: string }

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  return `${diffD} days ago`;
}

export async function TrainerHubMembersTopPanels({ trainerId }: Props) {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const pbRepo = new MongoPersonalBestRepository();

  const members = await userRepo.findAllMembers(trainerId);
  const memberIds = members.map((m) => m._id.toString());
  const memberNameMap = Object.fromEntries(members.map((m) => [m._id.toString(), m.name]));

  if (memberIds.length === 0) return null;

  const [streaks, recentSessions, recentPRs] = await Promise.all([
    Promise.all(memberIds.map((id) => sessionRepo.findConsecutiveStreakDays(id))),
    sessionRepo.findRecentCompletedByMemberIds(memberIds, 5),
    pbRepo.findRecentByMemberIds(memberIds, 5),
  ]);

  const streakEntries = members
    .map((m, i) => ({ name: m.name, streak: streaks[i] }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3);

  type ActivityItem = { text: string; time: Date };
  const activity: ActivityItem[] = [
    ...recentSessions.map((s) => ({
      text: `${memberNameMap[s.memberId] ?? 'Member'} completed ${s.dayName}`,
      time: s.completedAt,
    })),
    ...recentPRs.map((pb) => ({
      text: `${memberNameMap[pb.memberId.toString()] ?? 'Member'} hit new PR — ${pb.exerciseName}`,
      time: pb.achievedAt,
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 5);

  const rankColors = ['text-amber-400 bg-amber-400/10', 'text-primary-light bg-primary/10', 'text-primary-light bg-primary/10'];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      {/* Top Members */}
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
          Top Members
        </div>
        <div className="space-y-2">
          {streakEntries.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-foreground/25 w-4">{i + 1}</span>
              <span className="flex-1 text-sm text-foreground/70">{entry.name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${rankColors[i]}`}>
                {entry.streak}d streak
              </span>
            </div>
          ))}
          {streakEntries.length === 0 && (
            <p className="text-xs text-foreground/30">No active streaks yet</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
          Recent Activity
        </div>
        <div className="space-y-2.5">
          {activity.map((item) => (
            <div key={`${item.text}-${item.time.getTime()}`} className="flex gap-2.5 items-start">
              <div className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-[11px] text-foreground/60 leading-snug">{item.text}</p>
                <p className="text-[10px] text-foreground/25 mt-0.5">{timeAgo(item.time)}</p>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="text-xs text-foreground/30">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
