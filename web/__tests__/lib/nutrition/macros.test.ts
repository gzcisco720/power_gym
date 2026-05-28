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

const foodWithExtended = {
  per100g: {
    kcal: 200, protein: 20, carbs: 10, fat: 8,
    fiber: 4, sugar: 6, salt: 1, saturated: 2,
    polyunsaturated: 1, monounsaturated: 3, polyols: 0.5,
  },
  perServing: null,
};

describe('calculateMacros — extended', () => {
  it('scales optional fields proportionally with quantityG', () => {
    const result = calculateMacros(foodWithExtended, 50);
    expect(result.fiber).toBeCloseTo(2);
    expect(result.sugar).toBeCloseTo(3);
    expect(result.salt).toBeCloseTo(0.5);
    expect(result.saturated).toBeCloseTo(1);
    expect(result.polyunsaturated).toBeCloseTo(0.5);
    expect(result.monounsaturated).toBeCloseTo(1.5);
    expect(result.polyols).toBeCloseTo(0.25);
  });

  it('omits optional fields when source omits them', () => {
    const food = { per100g: { kcal: 200, protein: 20, carbs: 10, fat: 8 }, perServing: null };
    const result = calculateMacros(food, 100);
    expect(result.fiber).toBeUndefined();
    expect(result.sugar).toBeUndefined();
  });
});

describe('calculateMacros — extended micros', () => {
  it('scales cholesterol/sodium/potassium/transFat from per100g', () => {
    const out = calculateMacros({
      per100g: { kcal: 100, protein: 0, carbs: 0, fat: 0, cholesterol: 50, sodium: 300, potassium: 200, transFat: 0.5 },
      perServing: null,
    }, 50);
    expect(out.cholesterol).toBe(25);
    expect(out.sodium).toBe(150);
    expect(out.potassium).toBe(100);
    expect(out.transFat).toBe(0.25);
  });
});
