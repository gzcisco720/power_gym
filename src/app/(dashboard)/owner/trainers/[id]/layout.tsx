import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { TrainerTabNav } from '@/components/shared/trainer-tab-nav';

interface TrainerHubLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TrainerHubLayout({ children, params }: TrainerHubLayoutProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;

  await connectDB();
  const trainer = await new MongoUserRepository().findById(trainerId);
  if (!trainer || trainer.role !== 'trainer') redirect('/owner/trainers');

  const initials = trainer.name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const daysSinceJoined = Math.floor(
    (Date.now() - trainer.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-[#0f0f0f] bg-[#050505]">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#1a1a1a] text-[13px] font-semibold text-[#666]">
              {initials}
            </div>
            <div>
              <div className="text-[16px] font-bold text-white leading-tight">{trainer.name}</div>
              <div className="text-[11px] text-[#666] mt-0.5">
                {trainer.email}
                <span className="mx-1.5 text-[#333]">·</span>
                已加入 {daysSinceJoined} 天
              </div>
            </div>
          </div>
          <Link
            href="/owner/trainers"
            className="text-[11px] text-[#666] hover:text-[#aaa] transition-colors"
          >
            ← All Trainers
          </Link>
        </div>
        <TrainerTabNav trainerId={trainerId} />
      </div>
      <main>{children}</main>
    </div>
  );
}
