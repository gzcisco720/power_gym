import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { EmptyState } from '@/components/shared/empty-state';

function initials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const TRAINER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

export async function TrainerPerformanceSection() {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const trainers = await userRepo.findByRole('trainer');
  if (trainers.length === 0) {
    return (
      <EmptyState
        heading="No trainers yet"
        description="Invite a trainer to see performance data."
      />
    );
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const trainerStats = await Promise.all(
    trainers.map(async (trainer, i) => {
      const members = await userRepo.findAllMembers(trainer._id.toString());
      const memberIds = members.map(m => m._id.toString());
      const sessions =
        memberIds.length > 0
          ? await sessionRepo.countByMemberIdsSince(memberIds, startOfMonth)
          : 0;
      return {
        trainer,
        memberCount: members.length,
        sessions,
        color: TRAINER_COLORS[i % TRAINER_COLORS.length],
      };
    }),
  );

  trainerStats.sort((a, b) => b.sessions - a.sessions);
  const maxSessions = Math.max(...trainerStats.map(t => t.sessions), 1);

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        Trainer Performance — This Month
      </div>
      <div className="space-y-3">
        {trainerStats.map(({ trainer, memberCount, sessions, color }) => (
          <div key={trainer._id.toString()} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              {initials(trainer.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-foreground truncate">
                {trainer.name}
              </div>
              <div className="mt-1 h-[3px] bg-white/[.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((sessions / maxSessions) * 100)}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[12px] font-bold" style={{ color }}>
                {sessions} sessions
              </div>
              <div className="text-[9px] text-foreground/30 mt-0.5">{memberCount} members</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
