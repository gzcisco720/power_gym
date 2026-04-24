import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';

export async function POST(req: Request): Promise<Response> {
  const { name, email, password, token } = (await req.json()) as {
    name: string;
    email: string;
    password: string;
    token?: string;
  };

  await connectDB();
  const userRepo = new MongoUserRepository();

  if (!token) {
    const count = await userRepo.count();
    if (count > 0) {
      return Response.json({ error: 'Must use an invite link' }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await userRepo.create({ name, email, passwordHash, role: 'owner', trainerId: null });
    return Response.json({ success: true });
  }

  const inviteRepo = new MongoInviteRepository();
  const invite = await inviteRepo.findByToken(token);
  const validation = validateInviteToken(invite);

  if (!validation.valid) {
    return Response.json({ error: 'Invalid or expired invite' }, { status: 400 });
  }

  if (validation.invite.recipientEmail !== email.toLowerCase()) {
    return Response.json({ error: 'Email does not match invite' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await userRepo.create({
    name,
    email,
    passwordHash,
    role: validation.invite.role,
    trainerId: (validation.invite.trainerId ?? validation.invite.invitedBy).toString(),
  });
  await inviteRepo.markUsed(token);

  return Response.json({ success: true });
}
