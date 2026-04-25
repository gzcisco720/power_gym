import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/page-header';

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
  if (!plan) redirect('/member/plan');

  const planDay = plan.days.find((d) => d.dayNumber === dayNumber);
  if (!planDay) redirect('/member/plan');

  // Extract primitive values before the server action to avoid Mongoose
  // circular-reference serialization errors in Next.js progressive enhancement.
  const planIdStr = plan._id.toString();
  const planName = plan.name;

  async function startSession() {
    'use server';
    const s = await auth();
    if (!s?.user) return;
    const cookieStore = await cookies();
    const res = await fetch(`${process.env.AUTH_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieStore.toString(),
      },
      body: JSON.stringify({ memberPlanId: planIdStr, dayNumber }),
    });
    if (res.ok) {
      const data = (await res.json()) as { _id: string };
      redirect(`/member/plan/session/${data._id}`);
    }
  }

  return (
    <div>
      <PageHeader
        title={`Start ${planDay.name}`}
        subtitle={`Day ${dayNumber} · ${planDay.exercises.length} exercises`}
      />
      <div className="px-8 py-7">
        <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-6 max-w-md">
          <div className="text-[13px] font-semibold text-white mb-4">{planName}</div>
          <div className="space-y-2 mb-6">
            {planDay.exercises.map((ex) => (
              <div key={ex.exerciseName} className="flex items-center justify-between">
                <span className="text-[12px] text-[#666]">{ex.exerciseName}</span>
              </div>
            ))}
          </div>
          <form action={startSession}>
            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-white/90 text-[11px] font-semibold"
            >
              Start Session
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link
              href="/member/plan"
              className="text-[11px] text-[#2a2a2a] hover:text-[#555] transition-colors"
            >
              Back to plan
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
