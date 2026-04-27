import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { CalendarClient } from '@/components/calendar/calendar-client';

export default async function OwnerCalendarPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const trainers = await userRepo.findByRole('trainer');
  const members = await userRepo.findAllMembers();

  const trainerDtos = trainers.map((t) => ({ _id: t._id.toString(), name: t.name }));
  const memberDtos = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    trainerId: m.trainerId?.toString() ?? '',
  }));

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Calendar" subtitle="Manage all training sessions" />
      <CalendarClient
        currentUserRole="owner"
        currentUserId={session.user.id ?? ''}
        trainers={trainerDtos}
        members={memberDtos}
      />
    </div>
  );
}
