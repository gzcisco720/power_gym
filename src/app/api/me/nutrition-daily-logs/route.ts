import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoNutritionDailyLogRepository } from '@/lib/repositories/nutrition-daily-log.repository';

// Returns NutritionDailyLog (plan-based) entries for the authenticated member.
// Used by MiniNutritionCalendar to show plan-mode logged days alongside freestyle days.
export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const yearParam = url.searchParams.get('year');
  const monthParam = url.searchParams.get('month');
  if (!yearParam || !monthParam) {
    return Response.json({ error: 'year and month required' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoNutritionDailyLogRepository();
  const logs = await repo.findByMemberMonth(
    session.user.id,
    parseInt(yearParam, 10),
    parseInt(monthParam, 10),
  );
  return Response.json(logs);
}
