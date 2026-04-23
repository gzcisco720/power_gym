import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { PBBoard } from './_components/pb-board';

export default async function MemberPBsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const pbs = await new MongoPersonalBestRepository().findByMember(session.user.id);

  return <PBBoard pbs={JSON.parse(JSON.stringify(pbs))} />;
}
