import { connectDB } from '@/lib/db/connect';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { SectionHeader } from '@/components/shared/section-header';

export async function HealthSection({ memberId }: { memberId: string }) {
  await connectDB();
  const activeInjuries = await new MongoMemberInjuryRepository().findActiveByMember(memberId);

  return (
    <div>
      <SectionHeader title="Health" />
      <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        {activeInjuries.length === 0 ? (
          <p className="px-4 py-4 text-sm text-foreground/65">No active injuries</p>
        ) : (
          activeInjuries.map((injury) => (
            <div
              key={String(injury._id)}
              className="px-4 py-3 border-b border-border/40 last:border-0"
            >
              <p className="text-sm font-semibold text-foreground">{injury.title}</p>
              {injury.affectedMovements && (
                <p className="mt-0.5 text-xs text-foreground/65">{injury.affectedMovements}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
