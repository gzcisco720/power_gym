import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const trainerId = url.searchParams.get('trainerId') ?? undefined;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const members = await userRepo.findAllMembers(trainerId);

  const plain = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    email: m.email,
    trainerId: m.trainerId?.toString() ?? null,
    createdAt: m.createdAt,
  }));

  return Response.json(plain);
}
