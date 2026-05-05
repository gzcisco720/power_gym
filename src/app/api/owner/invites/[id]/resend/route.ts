import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { getEmailService } from '@/lib/email/index';
import { buildInviteUrl } from '@/lib/api/route-guards';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const inviteRepo = new MongoInviteRepository();
  const updated = await inviteRepo.regenerate(id);

  const inviteUrl = buildInviteUrl(updated.token);

  const emailService = getEmailService();
  await emailService.sendInvite({
    to: updated.recipientEmail,
    inviterName: session.user.name ?? 'Owner',
    role: updated.role,
    inviteUrl,
  });

  return Response.json({ inviteUrl });
}
