import { estimatedOneRM } from '@/lib/training/epley';

describe('estimatedOneRM', () => {
  it('calculates Epley 1RM: 100kg × 10 reps ≈ 133.33', () => {
    expect(estimatedOneRM(100, 10)).toBeCloseTo(133.33, 2);
  });

  it('returns weight × (1 + 1/30) for 1 rep', () => {
    expect(estimatedOneRM(100, 1)).toBeCloseTo(103.33, 2);
  });

  it('returns 0 when weight is 0', () => {
    expect(estimatedOneRM(0, 10)).toBe(0);
  });

  it('returns weight unchanged when reps is 0', () => {
    expect(estimatedOneRM(80, 0)).toBe(80);
  });
});
