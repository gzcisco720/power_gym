import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoNutritionDailyLogRepository } from '@/lib/repositories/nutrition-daily-log.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { resolveDayType } from '@/lib/nutrition/schedule';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string; date: string }> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PutBody {
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
}

function isPutBody(b: unknown): b is PutBody {
  if (!b || typeof b !== 'object') return false;
  const x = b as { dayTypeName?: unknown; meals?: unknown; dayCompleted?: unknown };
  return typeof x.dayTypeName === 'string' && Array.isArray(x.meals) && typeof x.dayCompleted === 'boolean';
}

async function checkRead(session: { user: { id: string; role: UserRole } }, memberId: string): Promise<Response | null> {
  const role = session.user.role;
  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (role === 'trainer') {
    const userRepo = new MongoUserRepository();
    const member = await userRepo.findById(memberId);
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  return null;
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId, date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });

  const guard = await checkRead(session as { user: { id: string; role: UserRole } }, memberId);
  if (guard) return guard;

  await connectDB();
  const logRepo = new MongoNutritionDailyLogRepository();
  const existing = await logRepo.findByDate(memberId, date);
  if (existing) return Response.json(existing);

  const planRepo = new MongoMemberNutritionPlanRepository();
  const plan = await planRepo.findActive(memberId);
  if (!plan) return Response.json(null);

  const dayTypeName = resolveDayType(plan.schedule, date);
  if (!dayTypeName) return Response.json(null);
  const dayType = plan.dayTypes.find((d) => d.name === dayTypeName);
  if (!dayType) return Response.json(null);

  return Response.json({
    memberId,
    planId: plan._id,
    date,
    dayTypeName,
    meals: dayType.meals.map((m) => ({
      name: m.name,
      order: m.order,
      completed: false,
      items: m.items,
    })),
    dayCompleted: false,
  });
}

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  const { memberId, date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });
  if (role !== 'member' || session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json()) as unknown;
  if (!isPutBody(body)) return Response.json({ error: 'Invalid body' }, { status: 400 });

  await connectDB();
  const planRepo = new MongoMemberNutritionPlanRepository();
  const plan = await planRepo.findActive(memberId);
  if (!plan) return Response.json({ error: 'No active plan' }, { status: 404 });

  const logRepo = new MongoNutritionDailyLogRepository();
  const existing = await logRepo.findByDate(memberId, date);
  if (existing?.dayCompleted) {
    return Response.json({ error: 'Day already completed' }, { status: 403 });
  }

  const upserted = await logRepo.upsert(memberId, date, {
    planId: plan._id.toString(),
    dayTypeName: body.dayTypeName,
    meals: body.meals,
    dayCompleted: body.dayCompleted,
  });
  return Response.json(upserted);
}
