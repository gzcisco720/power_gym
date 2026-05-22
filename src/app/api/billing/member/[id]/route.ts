import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import mongoose from 'mongoose';
import { ScheduledSessionModel } from '@/lib/db/models/scheduled-session.model';
import { ServiceTypeModel } from '@/lib/db/models/service-type.model';
import { calculateMemberBilling } from '@/lib/billing/calculate-billing';
import { MongoUserRepository } from '@/lib/repositories/user.repository';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: memberId } = await params;

  // Members can only see their own billing
  if (session.user.role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Trainers can only see billing for their own members
  if (session.user.role === 'trainer') {
    const userRepo = new MongoUserRepository();
    const member = await userRepo.findById(memberId);
    if (!member || member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (!mongoose.isValidObjectId(memberId)) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const url = new URL(req.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  const now = new Date();
  let from: Date, to: Date;
  if (fromParam && toParam) {
    from = new Date(fromParam);
    to = new Date(toParam);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return Response.json({ error: 'Invalid date parameters' }, { status: 400 });
  }

  const effectiveTo = to < now ? to : now;

  await connectDB();

  const sessions = await ScheduledSessionModel.find({
    memberIds: new mongoose.Types.ObjectId(memberId),
    date: { $gte: from, $lte: effectiveTo },
    status: 'scheduled',
    serviceTypeId: { $ne: null },
  }).lean();

  // Manual lookup — avoid populate() which requires ref on the schema singleton
  const stIds = [...new Set(
    sessions.map((s) => s.serviceTypeId?.toString()).filter((id): id is string => !!id),
  )];
  const stDocs = await ServiceTypeModel.find({ _id: { $in: stIds } }).lean();
  const stMap = new Map(stDocs.map((st) => [st._id.toString(), st]));

  const billingSessions = sessions.map((s) => ({
    _id: s._id.toString(),
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    serviceType: s.serviceTypeId ? (stMap.get(s.serviceTypeId.toString()) ?? null) : null,
  }));

  const billing = calculateMemberBilling(billingSessions, now);

  return Response.json({
    memberId,
    from: from.toISOString(),
    to: to.toISOString(),
    total: billing.total,
    count: billing.count,
    currency: billing.currency,
    lines: billing.lines,
  });
}
