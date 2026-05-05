import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Card } from '@/components/ui/card';
import { TrainerInviteDialogTrigger } from '../invites/_components/invite-dialog-trigger';
import { initials } from '@/lib/utils';

export default async function TrainerMembersPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const members = await new MongoUserRepository().findAllMembers(session.user.id);

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={`${members.length} member${members.length !== 1 ? 's' : ''}`}
        actions={<TrainerInviteDialogTrigger />}
      />
      <div className="px-4 sm:px-8 py-7">
        {members.length === 0 ? (
          <EmptyState
            heading="No members yet"
            description="Members assigned to you will appear here."
          />
        ) : (
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
            {members.map((member) => (
              <Link
                key={member._id.toString()}
                href={`/trainer/members/${member._id}`}
                className="flex items-center gap-4 px-5 py-4 border-b border-[#0f0f0f] last:border-0 hover:bg-[#0e0e0e] transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1e1e1e] bg-[#181818] text-[11px] font-semibold text-[#888]">
                  {initials(member.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-white truncate">{member.name}</div>
                  <div className="text-[11px] text-[#666] mt-0.5 truncate">{member.email}</div>
                </div>

                <div className="text-[12px] text-[#555] shrink-0">View →</div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
