import { connectDB } from '@/lib/db/connect';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { Card } from '@/components/ui/card';

export async function HealthSection({ memberId }: { memberId: string }) {
  await connectDB();
  const activeInjuries = await new MongoMemberInjuryRepository().findActiveByMember(memberId);

  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-3">
        Health
      </h2>
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
        {activeInjuries.length === 0 ? (
          <p className="px-5 py-5 text-[13px] text-[#555]">No active injuries</p>
        ) : (
          activeInjuries.map((injury) => (
            <div
              key={(injury._id as { toString(): string }).toString()}
              className="px-5 py-3.5 border-b border-[#0f0f0f] last:border-0"
            >
              <p className="text-[13px] font-medium text-white">{injury.title}</p>
              {injury.affectedMovements && (
                <p className="text-[11px] text-[#666] mt-0.5">{injury.affectedMovements}</p>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
