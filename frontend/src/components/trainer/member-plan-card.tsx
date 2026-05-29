import { Link } from 'react-router-dom';
import type { MemberPlan, WorkoutSession } from '@/api/training';

interface MemberPlanCardProps {
  memberId: string;
  plan: MemberPlan | null;
  sessions: WorkoutSession[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function formatAssigned(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function MemberPlanCard({ memberId, plan, sessions }: MemberPlanCardProps) {
  const planHref = `/trainer/members/${memberId}/plan`;

  if (!plan) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/15 bg-card/50 p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-foreground/30 mb-1.5">
            Active Plan
          </div>
          <div className="text-sm text-foreground/40">No active training plan</div>
        </div>
        <Link
          to={planHref}
          className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors shrink-0"
        >
          Assign Plan
        </Link>
      </div>
    );
  }

  const recentSessions = [...sessions]
    .filter((s) => s.completedAt !== null)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 4);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/8 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-primary-light mb-2">
        Active Plan
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[17px] font-bold text-foreground leading-tight truncate">
            {plan.name}
          </div>
          <div className="text-[12px] text-foreground/45 mt-1">
            {plan.days.length} day plan
            <span className="mx-1.5 text-foreground/20" aria-hidden="true">·</span>
            Assigned {formatAssigned(plan.assignedAt)}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={planHref}
            className="text-[12px] text-foreground/40 hover:text-foreground/65 transition-colors whitespace-nowrap"
          >
            Change Plan
          </Link>
        </div>
      </div>

      {recentSessions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-primary/12">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-foreground/35 mb-2">
            Recent Sessions
          </div>
          <div className="space-y-1.5">
            {recentSessions.map((s) => (
              <div key={s._id} className="flex items-center justify-between">
                <span className="text-[13px] text-foreground/80">Day {s.dayNumber}</span>
                <span className="text-[12px] text-foreground/40">
                  {formatDate(s.completedAt!)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
