import Link from 'next/link';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { auth } from '@/lib/auth/auth';

interface AlertItem {
  memberId: string;
  memberName: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  severity: 'red' | 'amber' | 'indigo' | 'pink';
}

const PILL_CLASS: Record<AlertItem['severity'], string> = {
  red: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25',
  amber: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25',
  indigo: 'bg-primary/15 text-primary-light ring-1 ring-primary/25',
  pink: 'bg-pink-500/15 text-pink-400 ring-1 ring-pink-500/25',
};

const SEVERITY_ORDER: Record<AlertItem['severity'], number> = {
  red: 0,
  amber: 1,
  indigo: 2,
  pink: 3,
};

export async function TrainerNeedsAttention() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const members = await new MongoUserRepository().findAllMembers(session.user.id);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const alerts: AlertItem[] = [];

  await Promise.all(
    members.map(async (member) => {
      const id = member._id.toString();
      const [recentSessions, plan, latestTest, nutritionPlan] = await Promise.all([
        new MongoWorkoutSessionRepository().countCompletedByMemberSince(id, sevenDaysAgo),
        new MongoMemberPlanRepository().findActive(id),
        new MongoBodyTestRepository().findLatestByMember(id),
        new MongoMemberNutritionPlanRepository().findActive(id),
      ]);

      if (!plan) {
        alerts.push({
          memberId: id,
          memberName: member.name,
          message: 'No training plan',
          actionLabel: 'Assign Plan',
          actionHref: `/trainer/members/${id}/plan`,
          severity: 'amber',
        });
      }
      if (!nutritionPlan) {
        alerts.push({
          memberId: id,
          memberName: member.name,
          message: 'No nutrition plan',
          actionLabel: 'Assign Nutrition',
          actionHref: `/trainer/members/${id}/nutrition`,
          severity: 'pink',
        });
      }
      if (latestTest && new Date(latestTest.date) < thirtyDaysAgo) {
        alerts.push({
          memberId: id,
          memberName: member.name,
          message: 'Body test 30+ days ago',
          actionLabel: 'Log Test',
          actionHref: `/trainer/members/${id}/body-tests`,
          severity: 'indigo',
        });
      }
      if (recentSessions === 0) {
        alerts.push({
          memberId: id,
          memberName: member.name,
          message: '7+ days idle',
          actionLabel: '',
          actionHref: `/trainer/members/${id}`,
          severity: 'red',
        });
      }
    }),
  );

  alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const shown = alerts.slice(0, 5);

  if (shown.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 min-h-[100px] flex flex-col">
        <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
          Needs Attention
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-foreground/40">All members on track ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
        Needs Attention
      </div>
      <div className="space-y-0">
        {shown.map((alert, i) => (
          <div
            key={i}
            className="flex items-center gap-2 py-2 border-b border-white/[.04] last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-foreground truncate">
                {alert.memberName}
              </div>
              <div className="text-[9px] text-foreground/35 mt-0.5">{alert.message}</div>
            </div>
            {alert.actionLabel ? (
              <Link
                href={alert.actionHref}
                className={`text-[9px] font-bold rounded px-2 py-0.5 flex-shrink-0 ${PILL_CLASS[alert.severity]}`}
              >
                {alert.actionLabel}
              </Link>
            ) : (
              <span
                className={`text-[9px] font-bold rounded px-2 py-0.5 flex-shrink-0 ${PILL_CLASS[alert.severity]}`}
              >
                {alert.message}
              </span>
            )}
          </div>
        ))}
      </div>
      {alerts.length > 5 && (
        <div className="mt-2 text-right">
          <Link href="/trainer/members" className="text-[10px] text-foreground/35 hover:text-foreground/60 transition-colors">
            View all ({alerts.length}) →
          </Link>
        </div>
      )}
    </div>
  );
}
