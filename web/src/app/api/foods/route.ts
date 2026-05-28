import mongoose from 'mongoose';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoFoodRepository, type CreateFoodData } from '@/lib/repositories/food.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { IFoodMacros, IFoodServing } from '@/lib/db/models/food.model';

const foods = new MongoFoodRepository();
const users = new MongoUserRepository();

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? undefined;
  const role = session.user.role;

  if (role === 'member') {
    const me = await users.findById(session.user.id);
    if (!me?.trainerId) return Response.json({ foods: [] });
    const list = await foods.findVisibleTo(me.trainerId, q);
    return Response.json({ foods: list });
  }

  const scopeId = new mongoose.Types.ObjectId(session.user.id);
  const list = await foods.findVisibleTo(scopeId, q);
  return Response.json({ foods: list });
}

interface CreateFoodBody {
  name: string;
  brand?: string | null;
  macrosPer100g: IFoodMacros;
  servings: IFoodServing[];
}

function isCreateFoodBody(b: unknown): b is CreateFoodBody {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  if (typeof o.name !== 'string' || !o.name.trim()) return false;
  if (o.brand !== undefined && o.brand !== null && typeof o.brand !== 'string') return false;
  if (!o.macrosPer100g || typeof o.macrosPer100g !== 'object') return false;
  const m = o.macrosPer100g as Record<string, unknown>;
  for (const k of ['kcal', 'protein', 'carbs', 'fat']) {
    if (typeof m[k] !== 'number') return false;
  }
  if (!Array.isArray(o.servings) || o.servings.length === 0) return false;
  for (const s of o.servings) {
    if (!s || typeof s !== 'object') return false;
    const so = s as Record<string, unknown>;
    if (typeof so.label !== 'string' || typeof so.grams !== 'number') return false;
  }
  return true;
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });
  await connectDB();

  const body = (await req.json()) as unknown;
  if (!isCreateFoodBody(body)) return Response.json({ error: 'Invalid body: missing or invalid required fields' }, { status: 400 });

  const data: CreateFoodData = {
    createdBy: new mongoose.Types.ObjectId(session.user.id),
    name: body.name.trim(),
    brand: body.brand ?? null,
    macrosPer100g: body.macrosPer100g,
    servings: body.servings,
  };
  const food = await foods.create(data);
  return Response.json({ food }, { status: 201 });
}
