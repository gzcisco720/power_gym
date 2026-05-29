import { Link } from 'react-router-dom';
import type { Injury } from '@/api/member-health';

interface MemberHealthPanelProps {
  memberId: string;
  injuries: Injury[];
}

export function MemberHealthPanel({ memberId, injuries }: MemberHealthPanelProps) {
  const healthHref = `/trainer/members/${memberId}/health`;
  const activeInjuries = injuries.filter((i) => i.status === 'active' || !i.resolvedAt);

  if (activeInjuries.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 flex flex-col gap-3 h-full">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
          Health
        </div>
        <div className="flex flex-col items-center justify-center flex-1 py-4 gap-2 text-center">
          <div className="text-2xl" aria-hidden="true">✓</div>
          <div className="text-[13px] font-semibold text-emerald-400">No active injuries</div>
          <div className="text-[11px] text-foreground/65">No injuries on record</div>
        </div>
        <Link
          to={healthHref}
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

      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
          Active {activeInjuries.length === 1 ? 'Injury' : 'Injuries'}
        </div>
        {activeInjuries.map((injury) => (
          <div
            key={injury._id}
            className="rounded-lg border border-destructive/12 bg-destructive/8 px-3 py-2.5"
          >
            <p className="text-[13px] font-semibold text-foreground">{injury.title}</p>
            {injury.bodyPart && (
              <p className="text-[11px] text-foreground/45 mt-0.5">{injury.bodyPart}</p>
            )}
            {injury.trainerNotes && (
              <p className="text-[11px] text-foreground/45 mt-0.5">{injury.trainerNotes}</p>
            )}
            <p className="text-[11px] text-red-400 mt-1">Active</p>
          </div>
        ))}
      </div>

      <Link
        to={healthHref}
        className="text-[11px] text-primary/70 hover:text-primary transition-colors mt-auto"
      >
        View full health profile →
      </Link>
    </div>
  );
}
