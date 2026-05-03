import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import { CheckInHistoryList } from './_components/check-in-history-list';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

export default async function MemberCheckInHistoryPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoCheckInRepository();
  const raw = await repo.findByMember(session.user.id);
  const checkIns = JSON.parse(JSON.stringify(raw)) as ICheckIn[];

  return (
    <div>
      <PageHeader title="Check-In History" subtitle="Your past weekly check-ins" />
      <div className="px-4 sm:px-8 py-7 max-w-2xl">
        <CheckInHistoryList checkIns={checkIns} />
      </div>
    </div>
  );
}
