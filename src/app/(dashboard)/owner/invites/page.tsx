import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { InviteListClient } from './_components/invite-list-client';
import { InviteCreateForm } from './_components/invite-create-form';

export default async function OwnerInvitesPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const inviteRepo = new MongoInviteRepository();
  const userRepo = new MongoUserRepository();

  const [invites, trainers] = await Promise.all([
    inviteRepo.findAll(),
    userRepo.findByRole('trainer'),
  ]);

  const invitePlain = invites.map((inv) => ({
    _id: inv._id.toString(),
    token: inv.token,
    role: inv.role,
    recipientEmail: inv.recipientEmail,
    expiresAt: inv.expiresAt.toISOString(),
    usedAt: inv.usedAt ? inv.usedAt.toISOString() : null,
    trainerId: inv.trainerId?.toString() ?? null,
  }));

  const trainerOptions = trainers.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
  }));

  const now = new Date();
  const pendingCount = invitePlain.filter(
    (inv) => !inv.usedAt && new Date(inv.expiresAt) > now,
  ).length;

  return (
    <div>
      <PageHeader title="Invites" subtitle={`${pendingCount} pending`} />
      <div className="px-8 py-7 space-y-10">
        <InviteListClient invites={invitePlain} />
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2a2a2a] mb-3.5">
            Generate New Invite
          </h2>
          <InviteCreateForm trainers={trainerOptions} />
        </div>
      </div>
    </div>
  );
}
