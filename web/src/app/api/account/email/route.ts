import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { EMAIL_RE } from '@/lib/validation/user';

export async function PATCH(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { email } = (await req.json()) as { email: string };
  const normalized = email?.toLowerCase()?.trim() ?? '';

  if (!EMAIL_RE.test(normalized)) {
    return Response.json({ error: 'Invalid email format' }, { status: 400 });
  }

  await connectDB();
  const userRepo = new MongoUserRepository();
  const existing = await userRepo.findByEmail(normalized);
  if (existing && existing._id.toString() !== session.user.id) {
    return Response.json({ error: 'Email already in use' }, { status: 409 });
  }

  await userRepo.updateEmail(session.user.id, normalized);
  return Response.json({ success: true });
}
