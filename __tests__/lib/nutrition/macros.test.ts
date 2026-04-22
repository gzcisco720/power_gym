import { calculateMacros } from '@/lib/nutrition/macros';

const foodPer100g = {
  per100g: { kcal: 200, protein: 20, carbs: 10, fat: 8 },
  perServing: null,
};

const foodPerServingOnly = {
  per100g: null,
  perServing: { servingLabel: '1片', grams: 30, kcal: 60, protein: 6, carbs: 3, fat: 2.4 },
};

describe('calculateMacros', () => {
  it('calculates macros from per100g for given quantity', () => {
    const result = calculateMacros(foodPer100g, 150);
    expect(result.kcal).toBeCloseTo(300);
    expect(result.protein).toBeCloseTo(30);
    expect(result.carbs).toBeCloseTo(15);
    expect(result.fat).toBeCloseTo(12);
  });

  it('falls back to perServing when per100g is null', () => {
    // 90g = 3 servings of 30g
    const result = calculateMacros(foodPerServingOnly, 90);
    expect(result.kcal).toBeCloseTo(180);
    expect(result.protein).toBeCloseTo(18);
    expect(result.carbs).toBeCloseTo(9);
    expect(result.fat).toBeCloseTo(7.2);
  });

  it('returns zeros when quantityG is 0', () => {
    const result = calculateMacros(foodPer100g, 0);
    expect(result.kcal).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    // 33g of 200kcal/100g food = 66 kcal
    const result = calculateMacros(foodPer100g, 33);
    expect(result.kcal).toBeCloseTo(66, 1);
  });
});
