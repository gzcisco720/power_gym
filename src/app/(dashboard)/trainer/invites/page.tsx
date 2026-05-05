import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { PageHeader } from '@/components/shared/page-header';
import { TrainerInviteListClient } from './_components/invite-list-client';
import { TrainerInviteDialogTrigger } from './_components/invite-dialog-trigger';

export default async function TrainerInvitesPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const inviteRepo = new MongoInviteRepository();
  const invites = await inviteRepo.findByInvitedBy(session.user.id);

  const invitePlain = invites.map((inv) => ({
    _id: inv._id.toString(),
    token: inv.token,
    role: inv.role,
    recipientEmail: inv.recipientEmail,
    expiresAt: inv.expiresAt.toISOString(),
    usedAt: inv.usedAt ? inv.usedAt.toISOString() : null,
    trainerId: inv.trainerId?.toString() ?? null,
  }));

  const now = new Date();
  const pendingCount = invitePlain.filter(
    (inv) => !inv.usedAt && new Date(inv.expiresAt) > now,
  ).length;

  return (
    <div>
      <PageHeader
        title="Invites"
        subtitle={`${pendingCount} pending`}
        actions={<TrainerInviteDialogTrigger />}
      />
      <div className="px-4 sm:px-8 py-7">
        <TrainerInviteListClient invites={invitePlain} />
      </div>
    </div>
  );
}
