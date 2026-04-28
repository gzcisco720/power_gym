import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

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
      />
      <div className="px-4 sm:px-8 py-7">
        {members.length === 0 ? (
          <EmptyState
            heading="No members yet"
            description="Members assigned to you will appear here."
          />
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Link
                key={member._id.toString()}
                href={`/trainer/members/${member._id}`}
                className="block bg-[#0c0c0c] border border-[#141414] rounded-xl p-4 hover:border-[#2a2a2a] transition-colors"
              >
                <div className="text-[14px] font-semibold text-white">{member.name}</div>
                <div className="text-[12px] text-[#888] mt-0.5">{member.email}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
