import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
import { MongoUserRepository } from '@/lib/repositories/user.repository';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { reassignToId } = (await req.json()) as { reassignToId: string };

  await connectDB();
  const userRepo = new MongoUserRepository();

  const trainer = await userRepo.findById(id);
  if (!trainer || trainer.role !== 'trainer') {
    return Response.json({ error: 'Trainer not found' }, { status: 404 });
  }

  const members = await userRepo.findAllMembers(id);
  await Promise.all(
    members.map((m) => userRepo.updateTrainerId(m._id.toString(), reassignToId)),
  );

  const newTrainer = await userRepo.findById(reassignToId);
  if (newTrainer && members.length > 0) {
    try {
      await getEmailService().sendMemberAssigned({
        to: newTrainer.email,
        trainerName: newTrainer.name,
        memberNames: members.map((m) => m.name),
        assignerName: session.user.name ?? 'Owner',
      });
    } catch (e) {
      console.error('sendMemberAssigned failed:', e);
    }
  }

  return Response.json({ success: true });
}
