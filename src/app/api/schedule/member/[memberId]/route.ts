import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;

  if (session.user.role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const repo = new MongoScheduledSessionRepository();
  const all = await repo.findByMember(memberId);
  const now = new Date();

  const upcoming = all.filter((s) => s.date >= now && s.status === 'scheduled');
  const history = all.filter((s) => s.date < now || s.status === 'cancelled');

  return Response.json({ upcoming, history });
}
