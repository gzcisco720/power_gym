import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { resolveDayType } from '@/lib/nutrition/schedule';

interface MacroItem {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
}

export function computeMacros(items: MacroItem[]): Macros {
  return items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      kcal: acc.kcal + item.kcal,
    }),
    { protein: 0, carbs: 0, fat: 0, kcal: 0 },
  );
}

export async function MemberNutritionToday() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const plan = await new MongoMemberNutritionPlanRepository().findActive(session.user.id);

  if (!plan) {
    return (
      <div className="bg-white/[.02] ring-1 ring-foreground/[.06] rounded-xl p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[.07em] text-foreground/65 mb-3">
          Nutrition Today
        </div>
        <p className="text-[11px] text-foreground/65 text-center py-2">
          No nutrition plan assigned
        </p>
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

  const bars = [
    { label: 'Protein', value: Math.round(macros.protein), unit: 'g', color: 'bg-emerald-500', trackColor: 'bg-emerald-500/15' },
    { label: 'Carbs', value: Math.round(macros.carbs), unit: 'g', color: 'bg-amber-500', trackColor: 'bg-amber-500/15' },
    { label: 'Fat', value: Math.round(macros.fat), unit: 'g', color: 'bg-pink-500', trackColor: 'bg-pink-500/15' },
    { label: 'Calories', value: Math.round(macros.kcal), unit: 'kcal', color: 'bg-foreground/30', trackColor: 'bg-white/[.04]' },
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
      <div className="space-y-3">
        {bars.map(({ label, value, unit, color, trackColor }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-foreground/65">{label}</span>
              <span className="text-[12px] font-bold text-foreground/80">
                {value} <span className="text-[10px] text-foreground/65 font-normal">{unit}</span>
              </span>
            </div>
            <div className={`h-1.5 rounded-full ${trackColor}`}>
              <div className={`h-full w-full rounded-full ${color}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
