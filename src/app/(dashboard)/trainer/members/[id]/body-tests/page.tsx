import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { BodyTestClient } from './_components/body-test-client';

export default async function TrainerMemberBodyTestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const repo = new MongoBodyTestRepository();
  const tests = await repo.findByMember(memberId);
  const plain = JSON.parse(JSON.stringify(tests)) as Parameters<typeof BodyTestClient>[0]['initialTests'];

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">体测管理</h1>
      <BodyTestClient memberId={memberId} initialTests={plain} />
    </div>
  );
}
