'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';
import type { UpsertCheckInConfigData } from '@/lib/repositories/check-in-config.repository';

export interface UpsertCheckInConfigState {
  error: string;
}

export async function upsertCheckInConfigAction(
  memberId: string,
  data: UpsertCheckInConfigData,
): Promise<UpsertCheckInConfigState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  try {
    await connectDB();
    const repo = new MongoCheckInConfigRepository();
    await repo.upsert(memberId, session.user.id, data);
    return { error: '' };
  } catch {
    return { error: 'Failed to save check-in schedule' };
  }
}
