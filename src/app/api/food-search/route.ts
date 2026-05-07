import { auth } from '@/lib/auth/auth';
import { fatsecretSearch } from '@/lib/nutrition/fatsecret-client';

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (!q) return Response.json({ error: 'q is required' }, { status: 400 });

  const pageSizeRaw = Number(url.searchParams.get('page_size') ?? '20');
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 1), 50) : 20;

  const pageNumberRaw = Number(url.searchParams.get('page_number') ?? '0');
  const pageNumber = Number.isFinite(pageNumberRaw) ? Math.max(pageNumberRaw, 0) : 0;

  try {
    const { results, totalResults, pageNumber: page } = await fatsecretSearch(q, pageSize, pageNumber);
    return Response.json({ results, total: totalResults, page });
  } catch (error) {
    console.error('food-search failed:', error);
    return Response.json({ error: 'Upstream search failed' }, { status: 502 });
  }
}
