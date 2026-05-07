import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export default async function TrainerLogNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id: memberId } = await params;
  const { day } = await searchParams;
  const dayNumber = parseInt(day ?? '1', 10);

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(memberId);
  if (!plan) redirect(`/trainer/members/${memberId}/plan`);

  const planDay = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!planDay) redirect(`/trainer/members/${memberId}/plan`);

  if (!process.env.AUTH_URL) redirect(`/trainer/members/${memberId}/plan`);

  const cookieStore = await cookies();
  const res = await fetch(`${process.env.AUTH_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStore.toString(),
    },
    body: JSON.stringify({ memberId, memberPlanId: plan._id.toString(), dayNumber }),
  });

  if (res.ok) {
    const data = (await res.json()) as { _id: string };
    redirect(`/trainer/members/${memberId}/log/${data._id}`);
  }

  if (res.status === 409) {
    const data = (await res.json()) as {
      activeSession?: { _id: string; dayName: string; dayNumber: number };
    };
    if (data.activeSession) {
      const params = new URLSearchParams({
        activeSession: data.activeSession._id,
        activeDayName: data.activeSession.dayName,
      });
      redirect(`/trainer/members/${memberId}/plan?${params.toString()}`);
    }
  }

  redirect(`/trainer/members/${memberId}/plan`);
}
