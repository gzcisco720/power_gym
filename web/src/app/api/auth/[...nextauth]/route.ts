import type { NextRequest } from 'next/server';
import { handlers } from '@/lib/auth/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const { GET } = handlers;

export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string[]>> }) {
  if (!checkRateLimit(req, 'login', 10, 15 * 60_000)) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }
  return handlers.POST(req, ctx);
}
