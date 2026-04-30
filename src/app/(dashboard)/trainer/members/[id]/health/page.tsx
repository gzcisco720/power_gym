import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { InjuryClient } from './_components/injury-client';
import type { IMemberInjury } from '@/lib/db/models/member-injury.model';

export type SerializedInjury = {
  _id: string;
  title: string;
  status: 'active' | 'resolved';
  recordedAt: string;
  trainerNotes: string | null;
  memberNotes: string | null;
  affectedMovements: string | null;
};

function serialize(injury: IMemberInjury): SerializedInjury {
  return {
    _id: (injury._id as { toString(): string }).toString(),
    title: injury.title,
    status: injury.status,
    recordedAt: injury.recordedAt.toISOString(),
    trainerNotes: injury.trainerNotes,
    memberNotes: injury.memberNotes,
    affectedMovements: injury.affectedMovements,
  };
}

export default async function MemberHealthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const injuries = await new MongoMemberInjuryRepository().findByMember(memberId);
  const plain = injuries.map(serialize);

  const role = session.user.role as 'owner' | 'trainer' | 'member';

  return (
    <div className="px-4 sm:px-8 py-7">
      <InjuryClient memberId={memberId} initialInjuries={plain} role={role} />
    </div>
  );
}
