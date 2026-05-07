import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { BodyTestClient } from '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client';
import type { BodyTestRecord } from '@/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client';

export default async function OwnerMyBodyTestsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const [tests, profile] = await Promise.all([
    new MongoBodyTestRepository().findByMember(session.user.id),
    new MongoUserProfileRepository().findByUserId(session.user.id),
  ]);
  const plain = JSON.parse(JSON.stringify(tests)) as BodyTestRecord[];

  const nowMs = new Date().getTime();
  const defaultSex = profile?.sex ?? null;
  const defaultAge = profile?.dateOfBirth
    ? Math.floor((nowMs - new Date(profile.dateOfBirth as unknown as string).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  return (
    <BodyTestClient
      memberId={session.user.id}
      initialTests={plain}
      defaultSex={defaultSex}
      defaultAge={defaultAge}
    />
  );
}
