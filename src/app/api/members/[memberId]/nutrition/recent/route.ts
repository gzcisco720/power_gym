import mongoose from 'mongoose';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { NutritionDailyLogModel } from '@/lib/db/models/nutrition-daily-log.model';
import { MongoUserRepository } from '@/lib/repositories/user.repository';

const users = new MongoUserRepository();
const LIMIT = 20;
const LOG_LOOKBACK = 30;

interface RecentItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ memberId: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const { memberId } = await ctx.params;
  if (!mongoose.isValidObjectId(memberId)) {
    return Response.json({ error: 'Invalid member id' }, { status: 400 });
  }

  const role = session.user.role;
  const callerId = session.user.id;

  if (role === 'member' && callerId !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (role === 'trainer') {
    const member = await users.findById(memberId);
    if (!member || !member.trainerId || member.trainerId.toString() !== callerId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  // owner: always allowed

  const logs = await NutritionDailyLogModel.find({ memberId: new mongoose.Types.ObjectId(memberId) })
    .sort({ date: -1 })
    .limit(LOG_LOOKBACK);

  const seen = new Set<string>();
  const recent: RecentItem[] = [];
  outer: for (const log of logs) {
    for (const meal of log.meals) {
      for (const item of meal.items) {
        if (seen.has(item.foodName)) continue;
        seen.add(item.foodName);
        recent.push({
          foodName: item.foodName,
          quantityG: item.quantityG,
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        });
        if (recent.length >= LIMIT) break outer;
      }
    }
  }

  return Response.json({ recent });
}
