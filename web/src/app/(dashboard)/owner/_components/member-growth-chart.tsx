import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MemberGrowthChartClient } from './member-growth-chart-client';

export async function MemberGrowthChart() {
  await connectDB();
  const data = await new MongoUserRepository().findMembersJoinedByMonth(6);
  return <MemberGrowthChartClient data={data} />;
}
