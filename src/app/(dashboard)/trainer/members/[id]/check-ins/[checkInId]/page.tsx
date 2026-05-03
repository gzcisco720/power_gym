import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import { CheckInDetail } from './_components/check-in-detail';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

export default async function TrainerCheckInDetailPage({
  params,
}: {
  params: Promise<{ id: string; checkInId: string }>;
}) {
  const { id: memberId, checkInId } = await params;

  await connectDB();
  const repo = new MongoCheckInRepository();

  // Trainer can view any check-in for their member — we use findByMember then filter
  const all = await repo.findByMember(memberId);
  const raw = all.find((c) => String((c as ICheckIn & { _id: unknown })._id) === checkInId);
  if (!raw) notFound();

  const checkIn = JSON.parse(JSON.stringify(raw)) as ICheckIn;
  const otherCheckIns = JSON.parse(
    JSON.stringify(all.filter((c) => String((c as ICheckIn & { _id: unknown })._id) !== checkInId)),
  ) as ICheckIn[];

  return (
    <div>
      <PageHeader
        title="Check-In Detail"
        subtitle={new Date(checkIn.submittedAt).toLocaleDateString('en-GB', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })}
      />
      <div className="px-4 sm:px-8 py-7 max-w-3xl">
        <CheckInDetail checkIn={checkIn} otherCheckIns={otherCheckIns} />
      </div>
    </div>
  );
}
