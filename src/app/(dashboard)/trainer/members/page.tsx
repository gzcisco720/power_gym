import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { Card } from '@/components/ui/card';
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
              <Card
                key={member._id.toString()}
                className="bg-[#0c0c0c] border-[#141414] rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:border-[#2a2a2a] transition-colors"
              >
                <div>
                  <div className="text-[14px] font-semibold text-white">{member.name}</div>
                  <div className="text-[12px] text-[#555] mt-0.5">{member.email}</div>
                </div>
                <div className="flex items-center gap-4 pt-3 border-t border-[#141414] sm:pt-0 sm:border-0">
                  <Link
                    href={`/trainer/members/${member._id}/plan`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Plan →
                  </Link>
                  <Link
                    href={`/trainer/members/${member._id}/body-tests`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Body Tests →
                  </Link>
                  <Link
                    href={`/trainer/members/${member._id}/nutrition`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Nutrition →
                  </Link>
                  <Link
                    href={`/trainer/members/${member._id}/progress`}
                    className="text-[11px] text-[#555] hover:text-[#888] transition-colors"
                  >
                    Progress →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
