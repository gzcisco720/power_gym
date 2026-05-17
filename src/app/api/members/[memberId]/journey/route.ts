import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { evaluateMilestone, selectEmoji, buildMilestoneTitle } from '@/lib/journey/milestone-calculator';
import { findNearestPhoto, findPhotosNear } from '@/lib/journey/photo-matcher';
import type { JourneyResponse, JourneySummary, JourneyItem, MilestoneInfo } from '@/lib/types/journey';
import type { BodyTestSnapshot } from '@/lib/journey/milestone-calculator';
import type { CheckInPhotoEntry } from '@/lib/journey/photo-matcher';
import type { IBodyTest } from '@/lib/db/models/body-test.model';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session) return new Response(null, { status: 401 });

  const { memberId } = await params;

  if (session.user.role !== 'member' || session.user.id !== memberId) {
    return new Response(null, { status: 403 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');
  const parsed = parseInt(url.searchParams.get('limit') ?? '10', 10);
  const limit = Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : 10, 50));

  await connectDB();

  const bodyTestRepo = new MongoBodyTestRepository();
  const checkInRepo = new MongoCheckInRepository();

  const [allTests, checkInData] = await Promise.all([
    bodyTestRepo.findAllByMemberAscending(memberId),
    checkInRepo.findPhotosForMember(memberId),
  ]);

  if (allTests.length === 0) {
    const response: JourneyResponse = { items: [], nextCursor: null, summary: null };
    return Response.json(response);
  }

  const first = allTests[0];
  const latest = allTests[allTests.length - 1];
  const summary: JourneySummary = {
    totalTests: allTests.length,
    firstTestDate: first.date.toISOString(),
    firstBodyFatPct: first.bodyFatPct,
    firstWeight: first.weight,
    firstLeanMassKg: first.leanMassKg,
    latestBodyFatPct: latest.bodyFatPct,
    latestWeight: latest.weight,
    latestLeanMassKg: latest.leanMassKg,
    leanMassDeltaKg: Math.round((latest.leanMassKg - first.leanMassKg) * 10) / 10,
  };

  const snapshots: BodyTestSnapshot[] = allTests.map((t: IBodyTest) => ({
    date: t.date,
    bodyFatPct: t.bodyFatPct,
    weight: t.weight,
    leanMassKg: t.leanMassKg,
    targetBodyFatPct: t.targetBodyFatPct,
    targetWeight: t.targetWeight,
  }));

  const photoEntries: CheckInPhotoEntry[] = checkInData.map(c => ({
    submittedAt: c.submittedAt,
    photos: c.photos,
  }));

  const checkInDates = photoEntries.map(c => c.submittedAt).sort((a, b) => a.getTime() - b.getTime());

  // Newest-first slice with cursor
  let descTests = [...allTests].reverse();
  if (cursor) {
    const cursorTime = new Date(cursor).getTime();
    if (!Number.isFinite(cursorTime)) {
      return new Response(null, { status: 400 });
    }
    descTests = descTests.filter(t => t.date.getTime() < cursorTime);
  }
  const pageSlice = descTests.slice(0, limit);
  const nextCursor = pageSlice.length === limit && descTests.length > limit
    ? pageSlice[pageSlice.length - 1].date.toISOString()
    : null;

  const items: JourneyItem[] = pageSlice.map((test: IBodyTest) => {
    const globalIndex = allTests.findIndex(t => t._id.toString() === test._id.toString());
    const triggers = evaluateMilestone(globalIndex, snapshots, checkInDates);
    const prev = globalIndex > 0 ? allTests[globalIndex - 1] : null;

    const milestone: MilestoneInfo | null = triggers.length > 0
      ? {
          emoji: selectEmoji(triggers),
          title: buildMilestoneTitle(triggers),
          tags: triggers.map(t => ({ label: t.label, color: t.color })),
          photos: findPhotosNear(test.date, photoEntries, 3),
        }
      : null;

    const item: JourneyItem = {
      bodyTest: {
        id: test._id.toString(),
        date: test.date.toISOString(),
        testNumber: globalIndex + 1,
        bodyFatPct: test.bodyFatPct,
        weight: test.weight,
        leanMassKg: test.leanMassKg,
        fatMassKg: test.fatMassKg,
        deltaBodyFatPct: prev ? Math.round((test.bodyFatPct - prev.bodyFatPct) * 10) / 10 : null,
        deltaWeight: prev ? Math.round((test.weight - prev.weight) * 10) / 10 : null,
      },
      checkInPhoto: findNearestPhoto(test.date, photoEntries),
      milestone,
    };
    return item;
  });

  const response: JourneyResponse = { items, nextCursor, summary };
  return Response.json(response);
}
