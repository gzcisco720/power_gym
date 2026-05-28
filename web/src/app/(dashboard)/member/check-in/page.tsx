import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PageHeader } from '@/components/shared/page-header';
import {
  computeAchievements,
  computeBodyMetrics,
  computeHeatmap,
  getWeekStart,
  type CheckInRecord,
} from '@/lib/check-in-stats';
import { CheckInDashboard } from './_components/check-in-dashboard';

export default async function MemberCheckInPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const repo = new MongoCheckInRepository();
  const memberId = session.user.id;

  const [rawCheckIns, rawPhotos] = await Promise.all([
    repo.findByMember(memberId),
    repo.findPhotosForMember(memberId),
  ]);

  // Serialize Mongoose documents to plain objects
  const checkIns: CheckInRecord[] = rawCheckIns.map(c => ({
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

  const now = new Date();
  const weekStart = getWeekStart(now);
  const hasThisWeek = checkIns.some(c => new Date(c.submittedAt) >= weekStart);

  const allPhotos = rawPhotos.flatMap(p =>
    p.photos.map(url => ({ url, submittedAt: p.submittedAt.toISOString() })),
  );

  const checkInsWithPhotos = checkIns.filter(c => c.photos.length > 0);

  return (
    <div>
      <PageHeader title="Check-In Dashboard" subtitle="Weekly progress tracking" />
      <CheckInDashboard
        checkIns={checkIns}
        hasThisWeek={hasThisWeek}
        achievements={computeAchievements(checkIns, now)}
        bodyMetrics={computeBodyMetrics(checkIns)}
        heatmap={computeHeatmap(checkIns, now)}
        checkInsWithPhotos={checkInsWithPhotos}
        allPhotos={allPhotos}
      />
    </div>
  );
}
