import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MemberTabNav } from '@/components/shared/member-tab-nav';
import { MemberHubProvider } from './_components/member-hub-provider';
import type { UserRole } from '@/types/auth';

interface MemberHubLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

function formatJoinDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(date);
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
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

  const hasActivePlan = !!(await new MongoMemberPlanRepository().findActive(memberId));

  const initials = member.name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const memberBase = role === 'owner' ? `/owner/members/${memberId}` : `/trainer/members/${memberId}`;
  const backHref = role === 'owner' ? '/owner/members' : '/trainer/members';
  const backLabel = role === 'owner' ? '← All Members' : '← Members';
  const planHref = `${memberBase}/plan`;

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border/60 bg-background">

        {/* Breadcrumb row */}
        <div className="px-4 pt-3 sm:px-8">
          <Link
            href={backHref}
            className="text-[11px] text-foreground/30 hover:text-foreground/55 transition-colors flex items-center gap-1 w-fit"
          >
            {backLabel}
          </Link>
        </div>

        {/* Identity + CTA row */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 ring-4 ring-primary/6 text-[15px] font-bold text-primary-light">
              {initials}
            </div>
            <div>
              <div className="text-[16px] font-bold text-foreground leading-tight">
                {member.name}
              </div>
              <div className="text-[11px] text-foreground/65 mt-0.5">
                {member.email}
                <span className="mx-1.5 text-foreground/20" aria-hidden="true">·</span>
                Joined {formatJoinDate(member.createdAt)}
              </div>
            </div>
          </div>

          {hasActivePlan && (
            <Link
              href={planHref}
              className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors"
            >
              Log Workout
            </Link>
          )}
        </div>

        {/* Tab bar */}
        <MemberTabNav basePath={memberBase} />
      </div>

      <MemberHubProvider basePath={memberBase}>
        <main>{children}</main>
      </MemberHubProvider>
    </div>
  );
}
