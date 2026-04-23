import Link from 'next/link';

interface PlanDay {
  dayNumber: number;
  name: string;
  exercises: { exerciseName: string }[];
}

interface Plan {
  _id: string;
  name: string;
  days: PlanDay[];
}

interface Props {
  plan: Plan | null;
}

export function PlanOverview({ plan }: Props) {
  if (!plan) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>暂无训练计划</p>
        <p className="text-sm mt-2">请联系您的教练分配计划</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{plan.name}</h1>
      <p className="text-muted-foreground mb-6">{plan.days.length} 天计划</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plan.days.map((day) => (
          <div key={day.dayNumber} className="rounded-lg border p-4 space-y-3">
            <div>
              <p className="font-medium">{day.name}</p>
              <p className="text-sm text-muted-foreground">{day.exercises.length} 个动作</p>
            </div>
            <Link
              href={`/dashboard/member/plan/session/new?day=${day.dayNumber}`}
              className="block text-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              开始训练
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
