import { auth } from '@/lib/auth/auth';
import { fatsecretGetFood } from '@/lib/nutrition/fatsecret-client';

export async function GET(_req: Request, ctx: { params: Promise<{ foodId: string }> }): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { foodId } = await ctx.params;
  try {
    const food = await fatsecretGetFood(foodId);
    return Response.json({ food });
  } catch (error) {
    console.error('food-get failed:', error);
    return Response.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }
}
