import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const repo = new MongoCheckInRepository();
  const url = new URL(req.url);

  if (session.user.role === 'member') {
    const checkIns = await repo.findByMember(session.user.id);
    return Response.json(checkIns);
  }

  const memberId = url.searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  const checkIns = await repo.findByMember(memberId);
  return Response.json(checkIns);
}
