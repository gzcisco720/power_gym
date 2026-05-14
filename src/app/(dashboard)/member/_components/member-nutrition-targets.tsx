import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { resolveDayType } from '@/lib/nutrition/schedule';

export async function MemberNutritionTargets() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberNutritionPlanRepository().findActive(session.user.id);

  if (!plan) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
          Today&apos;s Nutrition Targets
        </div>
        <p className="text-[11px] text-foreground/40 text-center py-2">No nutrition plan assigned</p>
      </div>
    );
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const startISO = new Date(plan.assignedAt).toISOString().slice(0, 10);
  const dayTypeName = resolveDayType(plan.schedule, todayISO, startISO);
  const dayType = plan.dayTypes.find((d) => d.name === dayTypeName) ?? plan.dayTypes[0];

  if (!dayType) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
          Today&apos;s Nutrition Targets
        </div>
        <p className="text-[11px] text-foreground/40 text-center py-2">No day type for today</p>
      </div>
    );
  }

  const allItems = dayType.meals.flatMap((m) => m.items);
  const totalProtein = allItems.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = allItems.reduce((sum, item) => sum + item.carbs, 0);
  const totalFat = allItems.reduce((sum, item) => sum + item.fat, 0);
  const totalKcal = allItems.reduce((sum, item) => sum + item.kcal, 0);

  const rows = [
    { label: 'Protein', value: `${Math.round(totalProtein)} g`, color: 'text-emerald-400' },
    { label: 'Carbs', value: `${Math.round(totalCarbs)} g`, color: 'text-amber-400' },
    { label: 'Fat', value: `${Math.round(totalFat)} g`, color: 'text-pink-400' },
    { label: 'Calories', value: `${Math.round(totalKcal)} kcal`, color: 'text-foreground/70' },
  ];

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold">
          Today&apos;s Nutrition Targets
        </div>
        <span className="text-[9px] text-foreground/25 bg-white/[.04] rounded px-1.5 py-0.5">
          {dayType.name}
        </span>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="text-[9px] uppercase tracking-[1px] text-foreground/35">{label}</div>
            <div className={`text-[13px] font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
