import { estimatedDuration } from '@/app/(dashboard)/member/_components/member-hero';

describe('estimatedDuration', () => {
  it('rounds up to nearest 5 minutes', () => {
    expect(estimatedDuration(4)).toBe(15);  // 4*2.5=10, min=15
    expect(estimatedDuration(6)).toBe(15);  // 6*2.5=15 → 15
    expect(estimatedDuration(8)).toBe(20);  // 8*2.5=20 → 20
    expect(estimatedDuration(10)).toBe(25); // 10*2.5=25 → 25
    expect(estimatedDuration(11)).toBe(30); // 11*2.5=27.5 → rounds up to 30
  });

  it('returns minimum 15 for 0 or very few sets', () => {
    expect(estimatedDuration(0)).toBe(15);
    expect(estimatedDuration(1)).toBe(15);
  });
});
