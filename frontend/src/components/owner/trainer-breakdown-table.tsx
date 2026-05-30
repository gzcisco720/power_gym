import { Link } from 'react-router-dom';

interface TrainerRow {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  memberCount: number;
  sessionsThisMonth: number;
}

interface Props {
  trainers: TrainerRow[];
}

export function TrainerBreakdownTable({ trainers }: Props) {
  if (trainers.length === 0) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-8 text-center">
        <p className="text-[13px] text-foreground/65">No trainers yet. Invite one to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
      <div className="hidden sm:grid grid-cols-[1fr_100px_120px_80px] border-b border-foreground/[.06] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-foreground/35">
        <div>Trainer</div>
        <div>Members</div>
        <div>Sessions / mo</div>
        <div></div>
      </div>

      {trainers.map((trainer) => (
        <div
          key={trainer._id}
          className="flex items-start justify-between gap-3 border-b border-foreground/[.04] px-5 py-3.5 last:border-0 hover:bg-muted transition-colors sm:grid sm:grid-cols-[1fr_100px_120px_80px] sm:items-center"
        >
          <div>
            <div className="text-[13px] font-medium text-foreground">{trainer.name}</div>
            <div className="text-[10px] text-foreground/65 mt-0.5">{trainer.email}</div>
            <div className="flex gap-4 mt-1.5 sm:hidden">
              <span className="text-[11px] font-semibold text-foreground/65">
                {trainer.memberCount}
                <span className="text-[9px] font-normal text-foreground/40 ml-0.5">members</span>
              </span>
              <span className="text-[11px] font-semibold text-foreground/65">
                {trainer.sessionsThisMonth}
                <span className="text-[9px] font-normal text-foreground/40 ml-0.5">sessions/mo</span>
              </span>
            </div>
          </div>
          <div className="hidden sm:block text-[13px] font-semibold text-foreground/60">
            {trainer.memberCount}
            <span className="text-[10px] font-medium text-foreground/40 ml-1">members</span>
          </div>
          <div className="hidden sm:block text-[13px] font-semibold text-foreground/60">
            {trainer.sessionsThisMonth}
          </div>
          <div>
            <Link
              to="/owner/trainers"
              className="text-[10px] text-foreground/40 hover:text-foreground/65 transition-colors whitespace-nowrap"
            >
              Manage →
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
