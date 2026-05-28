import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { avgWellnessScore, type CheckInRecord } from '@/lib/check-in-stats';

export default async function CheckInHistoryPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoCheckInRepository();
  const raw = await repo.findByMember(session.user.id);

  const checkIns: CheckInRecord[] = raw.map(c => ({
    _id: c._id.toString(),
    memberId: c.memberId.toString(),
    trainerId: c.trainerId.toString(),
    submittedAt: c.submittedAt.toISOString(),
    sleepQuality: c.sleepQuality,
    energy: c.energy,
    recovery: c.recovery,
    stress: c.stress,
    fatigue: c.fatigue,
    hunger: c.hunger,
    digestion: c.digestion,
    weight: c.weight,
    waist: c.waist,
    steps: c.steps,
    exerciseMinutes: c.exerciseMinutes,
    walkRunDistance: c.walkRunDistance,
    sleepHours: c.sleepHours,
    dietDetails: c.dietDetails,
    stuckToDiet: c.stuckToDiet,
    wellbeing: c.wellbeing,
    notes: c.notes,
    photos: c.photos,
  }));

  const DIET_LABEL: Record<string, string> = { yes: 'On track', no: 'Off track', partial: 'Partial' };
  const DIET_COLOUR: Record<string, string> = {
    yes: 'bg-emerald-400/10 text-emerald-400',
    no: 'bg-red-400/10 text-red-400',
    partial: 'bg-amber-400/10 text-amber-400',
  };

  return (
    <div>
      <PageHeader title="Check-In History" subtitle={`${checkIns.length} total check-ins`} />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto">
        <Link href="/member/check-in" className="text-sm text-foreground/65 hover:text-foreground mb-4 inline-block">
          ← Back to dashboard
        </Link>
        <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
          {checkIns.map((c) => (
            <Link
              key={c._id}
              href={`/member/check-in/${c._id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-foreground/[0.04] hover:bg-foreground/[0.025] transition-colors last:border-b-0"
            >
              <div className="min-w-[80px]">
                <div className="text-sm font-medium">{format(new Date(c.submittedAt), 'd MMM yyyy')}</div>
                <div className="text-[10px] text-foreground/30">{formatDistanceToNow(new Date(c.submittedAt), { addSuffix: true })}</div>
              </div>
              <div className="text-xs text-foreground/45">{avgWellnessScore(c)}/10</div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DIET_COLOUR[c.stuckToDiet]}`}>
                  {DIET_LABEL[c.stuckToDiet]}
                </span>
                {c.weight !== null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-foreground/45">
                    {c.weight} kg
                  </span>
                )}
              </div>
              <span className="text-foreground/18 text-sm">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
