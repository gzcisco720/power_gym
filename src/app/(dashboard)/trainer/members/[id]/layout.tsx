import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MemberTabNav } from '@/components/shared/member-tab-nav';
import type { UserRole } from '@/types/auth';

interface MemberHubLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function MemberHubLayout({ children, params }: MemberHubLayoutProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id: memberId } = await params;

  await connectDB();
  const member = await new MongoUserRepository().findById(memberId);
  if (!member) redirect('/trainer/members');

  const role = session.user.role as UserRole;
  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    redirect('/trainer/members');
  }

  const initials = member.name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const daysSinceJoined = Math.floor(
    (Date.now() - member.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div>
      {/* Profile header */}
      <div className="sticky top-0 z-10 border-b border-[#0f0f0f] bg-[#050505]">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#1a1a1a] text-[13px] font-semibold text-[#666]">
              {initials}
            </div>
            <div>
              <div className="text-[16px] font-bold text-white leading-tight">{member.name}</div>
              <div className="text-[11px] text-[#666] mt-0.5">
                {member.email}
                <span className="mx-1.5 text-[#333]">·</span>
                已加入 {daysSinceJoined} 天
              </div>
            </div>
          </div>
          {role === 'owner' && (
            <a
              href="/owner/members"
              className="text-[11px] text-[#666] hover:text-[#aaa] transition-colors"
            >
              ← All Members
            </a>
          )}
        </div>
        <MemberTabNav memberId={memberId} />
      </div>

      <main>{children}</main>
    </div>
  );
}
