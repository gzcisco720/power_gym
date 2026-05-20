import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';

function formatSinceDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export async function HealthPanelSection({ memberId }: { memberId: string }) {
  await connectDB();
  const [injuries, allMeds] = await Promise.all([
    new MongoMemberInjuryRepository().findActiveByMember(memberId),
    new MongoMemberMedicationRepository().findByMember(memberId),
  ]);
  const activeMeds = allMeds.filter((m) => m.status === 'active');
  const hasContent = injuries.length > 0 || activeMeds.length > 0;

  const healthHref = `/trainer/members/${memberId}/health`;

  if (!hasContent) {
    return (
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 flex flex-col gap-3 h-full">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
          Health
        </div>
        <div className="flex flex-col items-center justify-center flex-1 py-4 gap-2 text-center">
          <div className="text-2xl">✓</div>
          <div className="text-[13px] font-semibold text-emerald-400">No active concerns</div>
          <div className="text-[11px] text-foreground/65">No injuries or medications on record</div>
        </div>
        <Link
          href={healthHref}
          className="text-[11px] text-primary/70 hover:text-primary transition-colors mt-auto"
        >
          View full health profile →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/15 bg-destructive/6 p-4 flex flex-col gap-3 h-full">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400">
        Health
      </div>

      {injuries.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
            Active {injuries.length === 1 ? 'Injury' : 'Injuries'}
          </div>
          {injuries.map((injury) => (
            <div
              key={String(injury._id)}
              className="rounded-lg border border-destructive/12 bg-destructive/8 px-3 py-2.5"
            >
              <p className="text-[13px] font-semibold text-foreground">{injury.title}</p>
              {injury.affectedMovements && (
                <p className="text-[11px] text-foreground/45 mt-0.5">{injury.affectedMovements}</p>
              )}
              <p className="text-[11px] text-red-400 mt-1">Active</p>
            </div>
          ))}
        </div>
      )}

      {activeMeds.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
            {activeMeds.length === 1 ? 'Medication' : 'Medications'}
          </div>
          {activeMeds.map((med) => (
            <div
              key={String(med._id)}
              className="rounded-lg border border-foreground/8 bg-card/60 px-3 py-2.5"
            >
              <p className="text-[13px] font-semibold text-foreground">{med.name}</p>
              <p className="text-[11px] text-foreground/45 mt-0.5">
                {med.purpose}
                <span className="mx-1 text-foreground/20" aria-hidden="true">·</span>
                {med.duration === 'long_term' ? 'Long-term' : 'Short-term'}
                <span className="mx-1 text-foreground/20" aria-hidden="true">·</span>
                Since {formatSinceDate(med.startDate)}
              </p>
            </div>
          ))}
        </div>
      )}

      <Link
        href={healthHref}
        className="text-[11px] text-primary/70 hover:text-primary transition-colors mt-auto"
      >
        View full health profile →
      </Link>
    </div>
  );
}
