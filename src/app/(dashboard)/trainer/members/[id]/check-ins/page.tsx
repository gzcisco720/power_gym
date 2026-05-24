import { connectDB } from '@/lib/db/connect';
import { MongoCheckInConfigRepository } from '@/lib/repositories/check-in-config.repository';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { CheckInScheduleForm } from './_components/check-in-schedule-form';
import { CheckInList } from './_components/check-in-list';
import { CheckInTrends } from './_components/check-in-trends';
import type { ICheckInConfig } from '@/lib/db/models/check-in-config.model';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

export default async function TrainerMemberCheckInsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id: memberId }] = await Promise.all([params, connectDB()]);

  const [rawConfig, rawCheckIns] = await Promise.all([
    new MongoCheckInConfigRepository().findByMember(memberId),
    new MongoCheckInRepository().findByMember(memberId),
  ]);

  const config = rawConfig
    ? (JSON.parse(JSON.stringify(rawConfig)) as ICheckInConfig)
    : null;
  const checkIns = JSON.parse(JSON.stringify(rawCheckIns)) as ICheckIn[];

  return (
    <div className="space-y-8 py-6">
      <CheckInScheduleForm memberId={memberId} initialConfig={config} />
      {checkIns.length >= 2 && <CheckInTrends checkIns={checkIns} />}
      <CheckInList memberId={memberId} checkIns={checkIns} />
    </div>
  );
}
