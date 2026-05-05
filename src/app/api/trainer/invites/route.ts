import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { createInviteToken } from '@/lib/auth/invite';
import { getEmailService } from '@/lib/email/index';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const inviteRepo = new MongoInviteRepository();
  const invites = await inviteRepo.findByInvitedBy(session.user.id);

  const plain = invites.map((inv) => ({
    _id: inv._id.toString(),
    token: inv.token,
    role: inv.role,
    recipientEmail: inv.recipientEmail,
    expiresAt: inv.expiresAt,
    usedAt: inv.usedAt,
    trainerId: inv.trainerId?.toString() ?? null,
    invitedBy: inv.invitedBy.toString(),
  }));

  return Response.json(plain);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'trainer') return Response.json({ error: 'Forbidden' }, { status: 403 });

  let recipientEmail: string;
  try {
    const body = (await req.json()) as { recipientEmail?: unknown };
    if (typeof body.recipientEmail !== 'string' || !body.recipientEmail) {
      return Response.json({ error: 'recipientEmail is required' }, { status: 400 });
    }
    recipientEmail = body.recipientEmail;
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await connectDB();
  const inviteRepo = new MongoInviteRepository();
  const inviteToken = await createInviteToken(
    { role: 'member', invitedBy: session.user.id, recipientEmail, trainerId: session.user.id },
    inviteRepo,
  );

  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/register?token=${inviteToken.token}`;

  try {
    const emailService = getEmailService();
    await emailService.sendInvite({
      to: recipientEmail,
      inviterName: session.user.name ?? 'Your trainer',
      role: 'member',
      inviteUrl,
    });
  } catch (e) {
    console.error('Failed to send invite email:', e);
  }

  return Response.json({ inviteUrl });
}
