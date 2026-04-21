import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { createInviteToken } from '@/lib/auth/invite';
import { getEmailService } from '@/lib/email/index';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import type { UserRole } from '@/types/auth';

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role, recipientEmail } = (await req.json()) as {
    role: 'trainer' | 'member';
    recipientEmail: string;
  };

  const callerRole = session.user.role as UserRole;

  if (callerRole === 'member') {
    return Response.json({ error: 'Members cannot send invites' }, { status: 403 });
  }
  if (role === 'trainer' && callerRole !== 'owner') {
    return Response.json({ error: 'Only owners can invite trainers' }, { status: 403 });
  }

  await connectDB();
  const inviteRepo = new MongoInviteRepository();
  const inviteToken = await createInviteToken(
    { role, invitedBy: session.user.id, recipientEmail },
    inviteRepo,
  );

  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/register?token=${inviteToken.token}`;

  const emailService = getEmailService();
  await emailService.sendInvite({
    to: recipientEmail,
    inviterName: session.user.name ?? 'Your trainer',
    role,
    inviteUrl,
  });

  return Response.json({ inviteUrl });
}
