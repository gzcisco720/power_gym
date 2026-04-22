import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoFoodRepository } from '@/lib/repositories/food.repository';
import type { UserRole } from '@/types/auth';
import type { IPer100g, IPerServing } from '@/lib/db/models/food.model';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const repo = new MongoFoodRepository();
  const role = session.user.role as UserRole;

  const creatorId =
    role === 'member' ? (session.user.trainerId ?? null) : session.user.id;

  const foods = await repo.findAll({ creatorId });
  return Response.json(foods);
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if ((session.user.role as UserRole) === 'member') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const body = (await req.json()) as {
    name: string;
    brand?: string | null;
    per100g?: IPer100g | null;
    perServing?: IPerServing | null;
  };

  const repo = new MongoFoodRepository();
  const food = await repo.create({
    name: body.name,
    brand: body.brand ?? null,
    createdBy: session.user.id,
    isGlobal: false,
    per100g: body.per100g ?? null,
    perServing: body.perServing ?? null,
  });

  return Response.json(food, { status: 201 });
}
