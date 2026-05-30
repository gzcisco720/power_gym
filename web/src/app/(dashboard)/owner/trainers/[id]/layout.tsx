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
      <div className="sticky top-0 z-10 border-b border-foreground/[.06] bg-background">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_14px_rgba(99,102,241,0.35)] text-[13px] font-bold text-white">
              {initials}
            </div>
            <div>
              <div className="text-[16px] font-bold text-foreground leading-tight">{trainer.name}</div>
              <div className="text-[11px] text-foreground/65 mt-0.5">
                {trainer.email}
                <span className="mx-1.5 text-foreground/20">·</span>
                Joined {daysSinceJoined} days ago
              </div>
            </div>
          </div>
          <Link
            href="/owner/trainers"
            className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors"
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
