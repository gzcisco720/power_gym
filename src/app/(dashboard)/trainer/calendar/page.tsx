import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarClient } from '@/components/calendar/calendar-client';

export default async function TrainerCalendarPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const members = await userRepo.findAllMembers(session.user.id);

  const memberDtos = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    trainerId: session.user.id ?? '',
  }));

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Calendar" subtitle="Your training sessions" />
      <CalendarClient
        currentUserRole="trainer"
        currentUserId={session.user.id ?? ''}
        trainers={[]}
        members={memberDtos}
      />
    </div>
  );
}
