import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { CalendarClient } from '@/components/calendar/calendar-client';

export default async function TrainerHubCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const members = await userRepo.findAllMembers(trainerId);

  const memberDtos = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    trainerId: m.trainerId?.toString() ?? '',
  }));

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <CalendarClient
        currentUserRole="owner"
        currentUserId={session.user.id ?? ''}
        trainers={[]}
        members={memberDtos}
        readOnly
        filterTrainerId={trainerId}
      />
    </div>
  );
}
