import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import dynamic from 'next/dynamic';
const MemberGrowthChartClient = dynamic(
  () => import('./member-growth-chart-client').then((m) => m.MemberGrowthChartClient),
  { ssr: false },
);

export async function MemberGrowthChart() {
  await connectDB();
  const data = await new MongoUserRepository().findMembersJoinedByMonth(6);
  return <MemberGrowthChartClient data={data} />;
}
