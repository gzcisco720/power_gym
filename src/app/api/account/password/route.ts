import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PASSWORD_RE } from '@/lib/validation/user';

export async function PATCH(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = (await req.json()) as {
    currentPassword: string;
    newPassword: string;
  };

  if (!PASSWORD_RE.test(newPassword)) {
    return Response.json(
      { error: 'Password must be at least 8 characters with 1 uppercase and 1 number' },
      { status: 400 },
    );
  }

  await connectDB();
  const userRepo = new MongoUserRepository();
  const user = await userRepo.findById(session.user.id);
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return Response.json({ error: 'Current password is incorrect' }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await userRepo.updatePassword(session.user.id, passwordHash);
  return Response.json({ success: true });
}
