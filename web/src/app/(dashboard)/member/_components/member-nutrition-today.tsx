import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { resolveDayType } from '@/lib/nutrition/schedule';
import { computeMacros } from './member-nutrition-today.utils';

export async function MemberNutritionToday() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberNutritionPlanRepository().findActive(session.user.id);

  if (!plan) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4 flex flex-col min-h-[160px]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65 mb-3">
          Nutrition Today
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-foreground/40">No nutrition plan assigned</p>
        </div>
      </div>
    );
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const startISO = new Date(plan.assignedAt).toISOString().slice(0, 10);
  const dayTypeName = resolveDayType(plan.schedule, todayISO, startISO);
  const dayType = plan.dayTypes.find((d) => d.name === dayTypeName) ?? plan.dayTypes[0];

  if (!dayType) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
          Nutrition Today
        </div>
        <p className="text-[11px] text-foreground/65 text-center py-2">No day type for today</p>
      </div>
    );
  }

  const allItems = dayType.meals.flatMap((m) => m.items);
  const macros = computeMacros(allItems);

  const rows = [
    { label: 'Protein', value: Math.round(macros.protein), unit: 'g', colorClass: 'text-emerald-400' },
    { label: 'Carbs', value: Math.round(macros.carbs), unit: 'g', colorClass: 'text-amber-400' },
    { label: 'Fat', value: Math.round(macros.fat), unit: 'g', colorClass: 'text-pink-400' },
    { label: 'Calories', value: Math.round(macros.kcal), unit: 'kcal', colorClass: 'text-foreground/65' },
  ];

  return (
    <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65">
          Nutrition Today
        </div>
        <span className="text-[9px] bg-primary/[.12] text-primary-light ring-1 ring-primary/[.2] rounded-full px-2 py-0.5 font-semibold">
          {dayType.name}
        </span>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ label, value, unit, colorClass }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-[10px] text-foreground/65 uppercase tracking-[.05em]">{label}</span>
            <span className={`text-[14px] font-bold ${colorClass}`}>
              {value} <span className="text-[10px] text-foreground/65 font-normal">{unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
