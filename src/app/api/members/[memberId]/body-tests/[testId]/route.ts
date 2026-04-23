import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string; testId: string }> };

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { testId } = await params;

  await connectDB();
  const repo = new MongoBodyTestRepository();
  await repo.deleteById(testId, session.user.id);

  return new Response(null, { status: 204 });
}
