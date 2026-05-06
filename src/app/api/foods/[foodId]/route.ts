import mongoose from 'mongoose';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoFoodRepository, type UpdateFoodData } from '@/lib/repositories/food.repository';
import type { IFood, IFoodMacros, IFoodServing } from '@/lib/db/models/food.model';

const foods = new MongoFoodRepository();

interface UpdateFoodBody {
  name?: string;
  brand?: string | null;
  macrosPer100g?: IFoodMacros;
  servings?: IFoodServing[];
}

function isUpdateFoodBody(b: unknown): b is UpdateFoodBody {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  if (o.name !== undefined && (typeof o.name !== 'string' || !o.name.trim())) return false;
  if (o.brand !== undefined && o.brand !== null && typeof o.brand !== 'string') return false;
  if (o.macrosPer100g !== undefined) {
    if (!o.macrosPer100g || typeof o.macrosPer100g !== 'object') return false;
    const m = o.macrosPer100g as Record<string, unknown>;
    for (const k of ['kcal', 'protein', 'carbs', 'fat']) {
      if (typeof m[k] !== 'number') return false;
    }
  }
  if (o.servings !== undefined) {
    if (!Array.isArray(o.servings) || o.servings.length === 0) return false;
    for (const s of o.servings) {
      if (!s || typeof s !== 'object') return false;
      const so = s as Record<string, unknown>;
      if (typeof so.label !== 'string' || typeof so.grams !== 'number') return false;
    }
  }
  return true;
}

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

  const raw = (await req.json()) as unknown;
  if (!isUpdateFoodBody(raw)) return Response.json({ error: 'Invalid body' }, { status: 400 });
  const body: UpdateFoodData = raw;
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
