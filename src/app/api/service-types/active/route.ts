import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoServiceTypeRepository } from '@/lib/repositories/service-type.repository';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const repo = new MongoServiceTypeRepository();
  const types = await repo.findActive();
  return Response.json({ serviceTypes: types });
}
