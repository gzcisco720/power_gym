import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';

function formatAssignedDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export async function PlanCardSection({ memberId }: { memberId: string }) {
  await connectDB();
  const plan = await new MongoMemberPlanRepository().findActive(memberId);

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
          href={planHref}
          className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors shrink-0"
        >
          Assign Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/18 bg-primary/8 p-4">
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
            Assigned {formatAssignedDate(plan.assignedAt)}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={planHref}
            className="bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Log Workout
          </Link>
          <Link
            href={planHref}
            className="text-[12px] text-foreground/40 hover:text-foreground/65 transition-colors whitespace-nowrap"
          >
            Change Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
