import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import { CheckInForm } from './_components/check-in-form';

export default async function MemberCheckInPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoCheckInRepository();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const alreadySubmitted = await repo.hasCheckInThisWeek(session.user.id, weekStart);

  return (
    <div>
      <PageHeader title="Weekly Check-In" subtitle="Log your progress for this week" />
      <div className="px-4 sm:px-8 py-7 max-w-2xl">
        <CheckInForm alreadySubmitted={alreadySubmitted} />
      </div>
    </div>
  );
}
