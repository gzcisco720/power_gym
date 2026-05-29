import { averagePerDay } from '@/lib/nutrition/macro-totals';
import type { NutritionTemplate } from '@/api/nutrition';

describe('macro-totals', () => {
  describe('averagePerDay', () => {
    it('returns null when template has zero dayTypes', () => {
      const template: NutritionTemplate = {
        _id: '1',
        name: 'Empty',
        description: null,
        createdBy: 'u1',
        dayTypes: [],
      };
      expect(averagePerDay(template)).toBeNull();
    });

    it('sums all meal items within each day before averaging', () => {
      const template: NutritionTemplate = {
        _id: '2',
        name: 'Single Day',
        description: null,
        createdBy: 'u1',
        dayTypes: [
          {
            name: 'Day 1',
            meals: [
              {
                name: 'Breakfast',
                order: 1,
                items: [
                  { foodName: 'Egg', quantityG: 50, kcal: 70, protein: 6, carbs: 0, fat: 5 },
                  { foodName: 'Toast', quantityG: 30, kcal: 80, protein: 3, carbs: 15, fat: 1 },
                ],
              },
              {
                name: 'Lunch',
                order: 2,
                items: [
                  { foodName: 'Chicken', quantityG: 150, kcal: 250, protein: 40, carbs: 0, fat: 5 },
                ],
              },
            ],
          },
        ],
      };
      // Single day: total = sum of all items
      // kcal: 70+80+250=400, protein: 6+3+40=49, carbs: 0+15+0=15, fat: 5+1+5=11
      const result = averagePerDay(template);
      expect(result).not.toBeNull();
      expect(result!.kcal).toBe(400);
      expect(result!.protein).toBe(49);
      expect(result!.carbs).toBe(15);
      expect(result!.fat).toBe(11);
    });

    it('returns {kcal,protein,carbs,fat} averaged across all dayTypes for a multi-day template', () => {
      const template: NutritionTemplate = {
        _id: '3',
        name: 'Multi Day',
        description: null,
        createdBy: 'u1',
        dayTypes: [
          {
            name: 'Training Day',
            meals: [
              {
                name: 'Meal 1',
                order: 1,
                items: [
                  { foodName: 'Rice', quantityG: 200, kcal: 300, protein: 6, carbs: 60, fat: 1 },
                ],
              },
            ],
          },
          {
            name: 'Rest Day',
            meals: [
              {
                name: 'Meal 1',
                order: 1,
                items: [
                  { foodName: 'Oats', quantityG: 100, kcal: 100, protein: 4, carbs: 20, fat: 3 },
                ],
              },
            ],
          },
        ],
      };
      // Day 1 totals: kcal=300, protein=6, carbs=60, fat=1
      // Day 2 totals: kcal=100, protein=4, carbs=20, fat=3
      // Average: kcal=200, protein=5, carbs=40, fat=2
      const result = averagePerDay(template);
      expect(result).not.toBeNull();
      expect(result!.kcal).toBe(200);
      expect(result!.protein).toBe(5);
      expect(result!.carbs).toBe(40);
      expect(result!.fat).toBe(2);
    });
  });
});
