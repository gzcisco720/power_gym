import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await connectDB();
  const repo = new MongoCheckInRepository();

  const memberId = session.user.role === 'member' ? session.user.id : null;
  if (!memberId) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const checkIn = await repo.findById(id, memberId);
  if (!checkIn) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json(checkIn);
}
