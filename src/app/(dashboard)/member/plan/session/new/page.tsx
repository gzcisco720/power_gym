import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

export default async function SessionNewPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { day } = await searchParams;
  const dayNumber = parseInt(day ?? '1', 10);

  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(session.user.id);
  if (!plan) redirect('/dashboard/member/plan');

  const planDay = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!planDay) redirect('/dashboard/member/plan');

  async function startSession() {
    'use server';
    const s = await auth();
    if (!s?.user) return;
    const res = await fetch(`${process.env.AUTH_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: '' },
      body: JSON.stringify({ memberPlanId: plan!._id.toString(), dayNumber }),
    });
    if (res.ok) {
      const data = (await res.json()) as { _id: string };
      redirect(`/dashboard/member/plan/session/${data._id}`);
    }
  }

  return (
    <div className="max-w-sm mx-auto text-center space-y-6 py-16">
      <h1 className="text-2xl font-bold">{planDay.name}</h1>
      <p className="text-muted-foreground">{planDay.exercises.length} 个动作</p>
      <form action={startSession}>
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          开始训练
        </button>
      </form>
      <Link href="/dashboard/member/plan" className="text-sm text-muted-foreground hover:underline">
        返回
      </Link>
    </div>
  );
}
