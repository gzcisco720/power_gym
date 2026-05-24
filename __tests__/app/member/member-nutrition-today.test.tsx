import { computeMacros } from '@/app/(dashboard)/member/_components/member-nutrition-today.utils';

describe('computeMacros', () => {
  const items = [
    { protein: 30, carbs: 50, fat: 10, kcal: 410 },
    { protein: 20, carbs: 30, fat: 5, kcal: 245 },
  ];

  it('sums all macro items', () => {
    const result = computeMacros(items);
    expect(result.protein).toBe(50);
    expect(result.carbs).toBe(80);
    expect(result.fat).toBe(15);
    expect(result.kcal).toBe(655);
  });

  it('returns zeros for empty items', () => {
    const result = computeMacros([]);
    expect(result.protein).toBe(0);
    expect(result.kcal).toBe(0);
  });
});
