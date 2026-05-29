import 'reflect-metadata';
import { estimatedOneRM } from './epley';

describe('estimatedOneRM', () => {
  it('returns weight × (1 + reps / 30) for known input (100 kg × 5 reps = 116.666...)', () => {
    expect(estimatedOneRM(100, 5)).toBeCloseTo(100 * (1 + 5 / 30));
  });

  it('returns weight unchanged when reps === 0', () => {
    expect(estimatedOneRM(80, 0)).toBe(80);
  });

  it('scales — 10 reps gives a higher estimate than 5 reps for the same weight', () => {
    expect(estimatedOneRM(100, 10)).toBeGreaterThan(estimatedOneRM(100, 5));
  });
});
