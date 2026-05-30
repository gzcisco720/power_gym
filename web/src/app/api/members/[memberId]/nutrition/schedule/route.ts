import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { ISchedule } from '@/lib/db/models/member-nutrition-plan.model';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

function isSchedule(b: unknown): b is ISchedule {
  if (!b || typeof b !== 'object') return false;
  const s = b as { weeklyPattern?: unknown; calendarOverrides?: unknown; iterate?: unknown };
  return (
    Array.isArray(s.weeklyPattern) &&
    Array.isArray(s.calendarOverrides) &&
    typeof s.iterate === 'boolean'
  );
}

export async function PATCH(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const body = (await req.json()) as unknown;
  if (!isSchedule(body)) return Response.json({ error: 'Invalid schedule' }, { status: 400 });

  await connectDB();
  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });
  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const planRepo = new MongoMemberNutritionPlanRepository();
  const updated = await planRepo.updateSchedule(memberId, body);
  if (!updated) return Response.json({ error: 'No active plan' }, { status: 404 });
  return Response.json(updated);
}
