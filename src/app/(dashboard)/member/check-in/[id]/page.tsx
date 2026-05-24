import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { avgWellnessScore, type CheckInRecord } from '@/lib/check-in-stats';

export default async function MemberCheckInDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  await connectDB();
  const repo = new MongoCheckInRepository();
  const raw = await repo.findById(id, session.user.id);
  if (!raw) notFound();

  const c: CheckInRecord = {
    _id: raw._id.toString(),
    memberId: raw.memberId.toString(),
    trainerId: raw.trainerId.toString(),
    submittedAt: raw.submittedAt.toISOString(),
    sleepQuality: raw.sleepQuality,
    energy: raw.energy,
    recovery: raw.recovery,
    stress: raw.stress,
    fatigue: raw.fatigue,
    hunger: raw.hunger,
    digestion: raw.digestion,
    weight: raw.weight,
    waist: raw.waist,
    steps: raw.steps,
    exerciseMinutes: raw.exerciseMinutes,
    walkRunDistance: raw.walkRunDistance,
    sleepHours: raw.sleepHours,
    dietDetails: raw.dietDetails,
    stuckToDiet: raw.stuckToDiet,
    wellbeing: raw.wellbeing,
    notes: raw.notes,
    photos: raw.photos,
  };

  const RATINGS = [
    { label: 'Sleep Quality', value: c.sleepQuality },
    { label: 'Energy', value: c.energy },
    { label: 'Recovery', value: c.recovery },
    { label: 'Digestion', value: c.digestion },
    { label: 'Hunger', value: c.hunger },
    { label: 'Stress', value: c.stress },
    { label: 'Fatigue', value: c.fatigue },
  ];
  const STATS = [
    { label: 'Weight', value: c.weight, unit: 'kg' },
    { label: 'Waist', value: c.waist, unit: 'cm' },
    { label: 'Steps', value: c.steps, unit: '' },
    { label: 'Exercise', value: c.exerciseMinutes, unit: 'min' },
    { label: 'Sleep', value: c.sleepHours, unit: 'hrs' },
    { label: 'Walk/Run', value: c.walkRunDistance, unit: 'km' },
  ];

  return (
    <div>
      <PageHeader
        title={format(new Date(c.submittedAt), 'd MMMM yyyy')}
        subtitle={`Wellness score: ${avgWellnessScore(c)}/10`}
      />
      <div className="px-4 sm:px-8 py-6 max-w-2xl mx-auto space-y-4">
        <Link href="/member/check-in/history" className="text-sm text-foreground/65 hover:text-foreground inline-block">
          ← History
        </Link>

        {/* Ratings */}
        <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
          <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">How I felt</div>
          <div className="px-4 py-3 space-y-2.5">
            {RATINGS.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-foreground/45 w-28">{label}</span>
                <div className="flex-1 h-1.5 bg-foreground/[0.07] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${value * 10}%` }} />
                </div>
                <span className="text-xs font-semibold text-primary-light w-5 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
          <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">Body & Activity</div>
          <div className="grid grid-cols-3 gap-px bg-foreground/5">
            {STATS.map(({ label, value, unit }) => (
              <div key={label} className="bg-card px-3 py-2.5">
                <div className="text-[10px] text-foreground/35 uppercase tracking-wider">{label}</div>
                <div className="text-base font-bold mt-0.5">
                  {value !== null ? (
                    <>
                      {typeof value === 'number' && !Number.isInteger(value)
                        ? value.toFixed(1)
                        : value?.toLocaleString()}
                      {unit && <span className="text-xs text-foreground/35 font-normal ml-0.5">{unit}</span>}
                    </>
                  ) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diet */}
        <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] px-4 py-3 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">Diet</div>
          <div className="text-sm font-medium">
            {c.stuckToDiet === 'yes' ? 'On track' : c.stuckToDiet === 'no' ? 'Off track' : 'Partial'}
          </div>
          {c.dietDetails && <p className="text-xs text-foreground/65">{c.dietDetails}</p>}
        </div>

        {/* Wellbeing / Notes */}
        {(c.wellbeing || c.notes) && (
          <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] px-4 py-3 space-y-2">
            {c.wellbeing && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45 mb-0.5">Wellbeing</div>
                <p className="text-xs text-foreground/65">{c.wellbeing}</p>
              </div>
            )}
            {c.notes && (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45 mb-0.5">Notes</div>
                <p className="text-xs text-foreground/65">{c.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {c.photos.length > 0 && (
          <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] overflow-hidden">
            <div className="px-4 py-3 border-b border-foreground/5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45">
              Photos · {c.photos.length}
            </div>
            <div className="grid grid-cols-3 gap-[3px] p-[3px]">
              {c.photos.map((url, i) => (
                <div key={url} className="aspect-square rounded-[5px] overflow-hidden relative">
                  <Image src={url} alt="" fill sizes="(max-width: 768px) 33vw, 25vw" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
