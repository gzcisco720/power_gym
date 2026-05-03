import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const memberId = url.searchParams.get('memberId') ?? session.user.id;

  await connectDB();
  const repo = new MongoCheckInConfigRepository();
  const config = await repo.findByMember(memberId);

  return Response.json({ config });
}
