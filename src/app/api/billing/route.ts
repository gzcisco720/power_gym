import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import mongoose from 'mongoose';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { calculateMemberBilling } from '@/lib/billing/calculate-billing';

function getMonthRange(monthParam: string | null): { from: Date; to: Date } {
  const now = new Date();
  if (monthParam) {
    const [year, month] = monthParam.split('-').map(Number);
    if (year && month) {
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0, 23, 59, 59, 999);
      return { from, to };
    }
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  let from: Date, to: Date;
  if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
  } else {
    ({ from, to } = getMonthRange(url.searchParams.get('month')));
  }

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return Response.json({ error: 'Invalid date parameters' }, { status: 400 });
  }

  const now = new Date();
  const effectiveTo = to < now ? to : now;

  await connectDB();

  const query: Record<string, unknown> = {
    date: { $gte: from, $lte: effectiveTo },
    status: 'scheduled',
    serviceTypeId: { $ne: null },
  };
  if (session.user.role === 'trainer') {
    query.trainerId = new mongoose.Types.ObjectId(session.user.id);
  }

  const sessions = await ScheduledSessionModel.find(query).populate('serviceTypeId').lean();

  const memberSessions = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const memberIds = s.memberIds as mongoose.Types.ObjectId[];
    for (const mid of memberIds) {
      const key = mid.toString();
      if (!memberSessions.has(key)) memberSessions.set(key, []);
      memberSessions.get(key)!.push(s);
    }
  }

  const userRepo = new MongoUserRepository();
  const trainerIds = new Set(sessions.map((s) => s.trainerId?.toString()).filter(Boolean));
  const trainerDocs = await Promise.all(Array.from(trainerIds).map((id) => userRepo.findById(id!)));
  const trainerMap = new Map(trainerDocs.filter(Boolean).map((t) => [t!._id.toString(), t!.name]));

  const memberResults = await Promise.all(
    Array.from(memberSessions.entries()).map(async ([memberId, mSessions]) => {
      const member = await userRepo.findById(memberId);
      const trainerName = mSessions[0]?.trainerId
        ? (trainerMap.get(mSessions[0].trainerId.toString()) ?? '')
        : '';

      const billingSessions = mSessions.map((s) => ({
        _id: s._id.toString(),
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        serviceType: s.serviceTypeId as { _id: string; name: string; pricePerSession: number; currency: string } | null,
      }));

      const billing = calculateMemberBilling(billingSessions, now);

      return {
        memberId,
        name: member?.name ?? 'Unknown',
        trainerName,
        sessionsCount: billing.count,
        totalAmount: billing.total,
        currency: billing.currency,
        breakdown: billing.lines,
      };
    }),
  );

  const grandTotal = memberResults.reduce((sum, m) => sum + m.totalAmount, 0);
  const currency = memberResults[0]?.currency ?? 'CNY';

  return Response.json({ members: memberResults, grandTotal, currency });
}
