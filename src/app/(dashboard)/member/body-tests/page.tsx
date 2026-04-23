import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { BodyTestViewer } from './_components/body-test-viewer';
import type { ComponentProps } from 'react';

export default async function MemberBodyTestsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoBodyTestRepository();
  const tests = await repo.findByMember(session.user.id);
  const plain = JSON.parse(JSON.stringify(tests)) as ComponentProps<typeof BodyTestViewer>['tests'];

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">我的体测记录</h1>
      <BodyTestViewer tests={plain} />
    </div>
  );
}
