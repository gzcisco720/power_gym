import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { Skeleton } from '@/components/ui/skeleton';
import { HubPagination } from '@/components/shared/hub-pagination';
import { TrainerHubMembersTopPanels } from './_components/trainer-hub-members-top-panels';
import { TrainerHubMembersClient } from './_components/trainer-hub-members-client';

const PAGE_SIZE = 10;

export default async function TrainerHubMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const planRepo = new MongoMemberPlanRepository();

  const [{ members, total }, allTrainers] = await Promise.all([
    userRepo.findAllMembersPaginated(trainerId, page, PAGE_SIZE),
    userRepo.findByRole('trainer'),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const memberHealthData = await Promise.all(
    members.map(async (m) => {
      const memberId = m._id.toString();
      const [streak, sessionsThisMonth, activePlan] = await Promise.all([
        sessionRepo.findConsecutiveStreakDays(memberId),
        sessionRepo.countCompletedByMemberSince(memberId, startOfMonth),
        planRepo.findActive(memberId),
      ]);
      const status = !activePlan ? 'no-plan' : streak > 0 ? 'active' : 'needs-attn';
      return {
        _id: memberId,
        name: m.name,
        email: m.email,
        trainerId: m.trainerId?.toString() ?? null,
        streak,
        sessionsThisMonth,
        status: status as 'active' | 'needs-attn' | 'no-plan',
      };
    }),
  );

  const trainerDtos = allTrainers.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
  }));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const basePath = `/owner/trainers/${trainerId}/members`;

  return (
    <div className="px-4 sm:px-8 py-7">
      <Suspense fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      }>
        <TrainerHubMembersTopPanels trainerId={trainerId} />
      </Suspense>

      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        All Members ({total})
      </div>
      <TrainerHubMembersClient
        members={memberHealthData}
        trainers={trainerDtos}
        currentTrainerId={trainerId}
      />
      <HubPagination currentPage={page} totalPages={totalPages} basePath={basePath} />
    </div>
  );
}
