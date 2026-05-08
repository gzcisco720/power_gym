import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import type { ISelfMeal } from '@/lib/db/models/self-nutrition-log.model';
import type { IPlanDay, IPlanDayExercise } from '@/lib/db/models/plan-template.model';
import type { IDayType, IMeal } from '@/lib/db/models/nutrition-template.model';

export function setsToPlanDays(sets: ISelfWorkoutSet[], dayName: string): IPlanDay[] {
  const groups = new Map<string, ISelfWorkoutSet[]>();
  for (const s of sets) {
    const arr = groups.get(s.groupId) ?? [];
    arr.push(s);
    groups.set(s.groupId, arr);
  }

  const exercises: IPlanDayExercise[] = Array.from(groups.values()).map((groupSets) => {
    const first = groupSets[0];
    return {
      groupId: first.groupId,
      isSuperset: first.isSuperset,
      exerciseId: first.exerciseId,
      exerciseName: first.exerciseName,
      imageUrl: null,
      isBodyweight: first.isBodyweight,
      sets: groupSets.length,
      repsMin: first.prescribedRepsMin ?? 0,
      repsMax: first.prescribedRepsMax ?? 0,
      restSeconds: null,
    };
  });

  return [{ dayNumber: 1, name: dayName, exercises }];
}

export function mealsToDayType(meals: ISelfMeal[], dayTypeName: string): IDayType {
  const stripped: IMeal[] = meals.map((m) => ({
    name: m.name,
    order: m.order,
    items: m.items,
  }));
  return { name: dayTypeName, meals: stripped };
}
