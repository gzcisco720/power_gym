import mongoose from 'mongoose';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoFoodRepository, type UpdateFoodData } from '@/lib/repositories/food.repository';
import type { IFood } from '@/lib/db/models/food.model';

const foods = new MongoFoodRepository();

type AuthorizeResult =
  | { ok: true; food: IFood; userId: mongoose.Types.ObjectId }
  | { ok: false; status: 401 | 403 | 404 };

async function authorizeOwner(foodId: string): Promise<AuthorizeResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, status: 401 };
  if (session.user.role === 'member') return { ok: false, status: 403 };
  await connectDB();
  if (!mongoose.isValidObjectId(foodId)) return { ok: false, status: 404 };
  const food = await foods.findById(new mongoose.Types.ObjectId(foodId));
  if (!food) return { ok: false, status: 404 };
  const userId = new mongoose.Types.ObjectId(session.user.id);
  if (!food.createdBy.equals(userId)) return { ok: false, status: 403 };
  return { ok: true, food, userId };
}

function errorResponse(status: number): Response {
  const messages: Record<number, string> = {
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not found',
  };
  return Response.json({ error: messages[status] ?? 'Error' }, { status });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ foodId: string }> },
): Promise<Response> {
  const { foodId } = await ctx.params;
  const ac = await authorizeOwner(foodId);
  if (!ac.ok) return errorResponse(ac.status);

  const body = (await req.json()) as UpdateFoodData;
  const updated = await foods.update(new mongoose.Types.ObjectId(foodId), body);
  return Response.json({ food: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ foodId: string }> },
): Promise<Response> {
  const { foodId } = await ctx.params;
  const ac = await authorizeOwner(foodId);
  if (!ac.ok) return errorResponse(ac.status);
  await foods.delete(new mongoose.Types.ObjectId(foodId));
  return new Response(null, { status: 204 });
}
