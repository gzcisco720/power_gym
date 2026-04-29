import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { BodyTestClient, type BodyTestRecord } from './_components/body-test-client';

export default async function TrainerMemberBodyTestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const [tests, memberProfile] = await Promise.all([
    new MongoBodyTestRepository().findByMember(memberId),
    new MongoUserProfileRepository().findByUserId(memberId),
  ]);
  const plain = JSON.parse(JSON.stringify(tests)) as BodyTestRecord[];

  const defaultSex = (memberProfile?.sex ?? null) as 'male' | 'female' | null;
  const nowMs = new Date().getTime();
  const defaultAge =
    memberProfile?.dateOfBirth
      ? Math.floor(
          (nowMs - new Date(memberProfile.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25),
        )
      : null;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">体测管理</h1>
      <BodyTestClient
        memberId={memberId}
        initialTests={plain}
        defaultSex={defaultSex}
        defaultAge={defaultAge}
      />
    </div>
  );
}
