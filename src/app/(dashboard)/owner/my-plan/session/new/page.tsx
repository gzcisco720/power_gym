import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export default async function OwnerSessionNewPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { day } = await searchParams;
  const dayNumber = parseInt(day ?? '1', 10);

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(session.user.id);
  if (!plan) redirect('/owner/my-plan');

  const planDay = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!planDay) redirect('/owner/my-plan');

  if (!process.env.AUTH_URL) redirect('/owner/my-plan');

  const cookieStore = await cookies();
  const res = await fetch(`${process.env.AUTH_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieStore.toString(),
    },
    body: JSON.stringify({ memberPlanId: plan._id.toString(), dayNumber }),
  });

  if (res.ok) {
    const data = (await res.json()) as { _id: string };
    redirect(`/owner/my-plan/session/${data._id}`);
  }

  redirect('/owner/my-plan');
}
