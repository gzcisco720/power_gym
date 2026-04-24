import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { trainerId } = (await req.json()) as { trainerId: string };

  await connectDB();
  const userRepo = new MongoUserRepository();

  const member = await userRepo.findById(id);
  if (!member || member.role !== 'member') {
    return Response.json({ error: 'Member not found' }, { status: 404 });
  }

  await userRepo.updateTrainerId(id, trainerId);
  return Response.json({ success: true });
}
