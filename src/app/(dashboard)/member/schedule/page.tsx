import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { MemberScheduleList } from './_components/member-schedule-list';

export default async function MemberSchedulePage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const userRepo = new MongoUserRepository();

  const all = await repo.findByMember(session.user.id ?? '');
  const now = new Date();
  const upcoming = all.filter((s) => s.date >= now && s.status === 'scheduled');
  const history = all.filter((s) => s.date < now || s.status === 'cancelled');

  const trainerIds = [...new Set(all.map((s) => s.trainerId.toString()))];
  const trainerDocs = await Promise.all(trainerIds.map((id) => userRepo.findById(id)));
  const trainerMap = Object.fromEntries(
    trainerDocs.filter((t): t is NonNullable<typeof t> => t !== null).map((t) => [t._id.toString(), t.name]),
  );

  type SessionItem = (typeof all)[0];

  const toDto = (s: SessionItem) => ({
    _id: s._id.toString(),
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    trainerName: trainerMap[s.trainerId.toString()] ?? 'Trainer',
    memberCount: s.memberIds.length,
    status: s.status,
    isRecurring: s.seriesId !== null,
  });

  return (
    <div>
      <PageHeader title="My Schedule" subtitle={`${upcoming.length} upcoming session${upcoming.length !== 1 ? 's' : ''}`} />
      <MemberScheduleList upcoming={upcoming.map(toDto)} history={history.map(toDto)} />
    </div>
  );
}
