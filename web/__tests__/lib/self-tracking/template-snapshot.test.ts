import mongoose from 'mongoose';
import { setsToPlanDays, mealsToDayType } from '@/lib/self-tracking/template-snapshot';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import type { ISelfMeal } from '@/lib/db/models/self-nutrition-log.model';

const exA = new mongoose.Types.ObjectId();
const exB = new mongoose.Types.ObjectId();

const sets: ISelfWorkoutSet[] = [
  { exerciseId: exA, exerciseName: 'Bench', groupId: 'g1', isSuperset: false, isBodyweight: false, setNumber: 1, prescribedRepsMin: 5, prescribedRepsMax: 8, actualWeight: 100, actualReps: 5, completedAt: new Date() },
  { exerciseId: exA, exerciseName: 'Bench', groupId: 'g1', isSuperset: false, isBodyweight: false, setNumber: 2, prescribedRepsMin: 5, prescribedRepsMax: 8, actualWeight: 100, actualReps: 5, completedAt: new Date() },
  { exerciseId: exB, exerciseName: 'Row',   groupId: 'g2', isSuperset: false, isBodyweight: false, setNumber: 1, prescribedRepsMin: 8, prescribedRepsMax: 12, actualWeight: 60,  actualReps: 8, completedAt: new Date() },
];

describe('setsToPlanDays', () => {
  it('produces a single day with grouped exercises and prescribed-only fields', () => {
    const days = setsToPlanDays(sets, 'Push Day');
    expect(days).toHaveLength(1);
    expect(days[0].name).toBe('Push Day');
    expect(days[0].dayNumber).toBe(1);
    expect(days[0].exercises).toHaveLength(2);
    expect(days[0].exercises[0]).toMatchObject({
      exerciseName: 'Bench',
      groupId: 'g1',
      sets: 2,
      repsMin: 5,
      repsMax: 8,
    });
    expect(days[0].exercises[1]).toMatchObject({
      exerciseName: 'Row',
      sets: 1,
      repsMin: 8,
      repsMax: 12,
    });
    // No actual* fields should be present
    expect(days[0].exercises[0]).not.toHaveProperty('actualWeight');
  });

  it('falls back to repsMin/Max=0 when prescribed is null (freestyle)', () => {
    const fs: ISelfWorkoutSet[] = [
      { exerciseId: exA, exerciseName: 'X', groupId: 'g1', isSuperset: false, isBodyweight: false, setNumber: 1, prescribedRepsMin: null, prescribedRepsMax: null, actualWeight: 50, actualReps: 5, completedAt: new Date() },
    ];
    const days = setsToPlanDays(fs, 'Freestyle');
    expect(days[0].exercises[0].repsMin).toBe(0);
    expect(days[0].exercises[0].repsMax).toBe(0);
  });
});

describe('mealsToDayType', () => {
  it('strips completed flag and returns IDayType-shaped data', () => {
    const meals: ISelfMeal[] = [
      { name: 'Breakfast', order: 0, completed: true, items: [{ foodName: 'Egg', quantityG: 100, kcal: 150, protein: 12, carbs: 1, fat: 10 }] },
    ];
    const dayType = mealsToDayType(meals, 'Training Day');
    expect(dayType.name).toBe('Training Day');
    expect(dayType.meals[0]).not.toHaveProperty('completed');
    expect(dayType.meals[0].items[0].foodName).toBe('Egg');
  });
});
