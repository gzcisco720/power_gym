import { dayTypeTotals, scaleMacros } from './nutrition-macros';
import { DayType } from '../types/nutrition-templates';

describe('nutritionMacros', () => {
  describe('dayTypeTotals', () => {
    it('sums kcal and protein across all items in all meals of a day type', () => {
      const dayType: DayType = {
        name: 'Training Day',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [
              { foodName: 'Oats', quantityG: 100, kcal: 380, protein: 13, carbs: 66, fat: 7 },
              { foodName: 'Whey', quantityG: 30, kcal: 120, protein: 24, carbs: 3, fat: 1 },
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [
              { foodName: 'Chicken', quantityG: 150, kcal: 248, protein: 47, carbs: 0, fat: 5 },
            ],
          },
        ],
      };

      const totals = dayTypeTotals(dayType);

      expect(totals.kcal).toBe(748);
      expect(totals.protein).toBe(84);
      expect(totals.carbs).toBe(69);
      expect(totals.fat).toBe(13);
    });

    it('returns zeros for a day type with no meals or empty meals', () => {
      const emptyDayType: DayType = { name: 'Rest Day', meals: [] };

      const totals = dayTypeTotals(emptyDayType);

      expect(totals.kcal).toBe(0);
      expect(totals.protein).toBe(0);
      expect(totals.carbs).toBe(0);
      expect(totals.fat).toBe(0);
    });
  });

  describe('scaleMacros', () => {
    it('scales a food per-100g macros to a given gram quantity (rounded)', () => {
      const per100g = { kcal: 165, protein: 31, carbs: 0, fat: 3.6 };

      const scaled = scaleMacros(per100g, 150);

      expect(scaled.kcal).toBe(248);
      expect(scaled.protein).toBe(47);
      expect(scaled.carbs).toBe(0);
      expect(scaled.fat).toBe(5);
    });

    it('returns zeros when quantity is 0', () => {
      const per100g = { kcal: 165, protein: 31, carbs: 0, fat: 3.6 };

      const scaled = scaleMacros(per100g, 0);

      expect(scaled.kcal).toBe(0);
      expect(scaled.protein).toBe(0);
      expect(scaled.carbs).toBe(0);
      expect(scaled.fat).toBe(0);
    });
  });
});
