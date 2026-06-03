import { calculateBodyFat, calculateComposition } from '../../src/lib/body-test-formulas';

describe('body-test-formulas', () => {
  describe('calculateBodyFat', () => {
    it('returns null when a required 3site site is missing', () => {
      // chest is NaN — should return null
      expect(
        calculateBodyFat('3site', 'male', 30, { chest: NaN, abdominal: 20, thigh: 15 }),
      ).toBeNull();
      // abdominal is missing
      expect(
        calculateBodyFat('3site', 'male', 30, { chest: 10, thigh: 15 }),
      ).toBeNull();
      // 3site female missing suprailiac
      expect(
        calculateBodyFat('3site', 'female', 25, { tricep: 15, thigh: 20 }),
      ).toBeNull();
    });

    it('3site male matches backend formula output (clamped to [1,60])', () => {
      const sum = 10 + 20 + 15; // 45, age=30
      const density =
        1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * 30;
      const raw = 495 / density - 450;
      const expected = Math.min(60, Math.max(1, raw));

      const result = calculateBodyFat('3site', 'male', 30, {
        chest: 10,
        abdominal: 20,
        thigh: 15,
      });
      expect(result).not.toBeNull();
      expect(result as number).toBeCloseTo(expected, 5);
    });

    it('3site female matches backend formula output (clamped to [1,60])', () => {
      const sum = 15 + 12 + 20; // 47, age=25
      const density =
        1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * 25;
      const raw = 495 / density - 450;
      const expected = Math.min(60, Math.max(1, raw));

      const result = calculateBodyFat('3site', 'female', 25, {
        tricep: 15,
        suprailiac: 12,
        thigh: 20,
      });
      expect(result).not.toBeNull();
      expect(result as number).toBeCloseTo(expected, 5);
    });

    it('7site male matches backend formula output (clamped to [1,60])', () => {
      const sum = 10 + 8 + 12 + 14 + 20 + 10 + 15; // 89, age=35
      const density =
        1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * 35;
      const raw = 495 / density - 450;
      const expected = Math.min(60, Math.max(1, raw));

      const result = calculateBodyFat('7site', 'male', 35, {
        chest: 10,
        midaxillary: 8,
        tricep: 12,
        subscapular: 14,
        abdominal: 20,
        suprailiac: 10,
        thigh: 15,
      });
      expect(result).not.toBeNull();
      expect(result as number).toBeCloseTo(expected, 5);
    });

    it('7site female matches backend formula output (clamped to [1,60])', () => {
      const sum = 10 + 8 + 12 + 14 + 20 + 10 + 15; // 89, age=28
      const density =
        1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * 28;
      const raw = 495 / density - 450;
      const expected = Math.min(60, Math.max(1, raw));

      const result = calculateBodyFat('7site', 'female', 28, {
        chest: 10,
        midaxillary: 8,
        tricep: 12,
        subscapular: 14,
        abdominal: 20,
        suprailiac: 10,
        thigh: 15,
      });
      expect(result).not.toBeNull();
      expect(result as number).toBeCloseTo(expected, 5);
    });

    it('9site Parrillo returns sum*0.1051 + 2.585 (same for male and female), clamped', () => {
      const sum = 10 + 12 + 14 + 18 + 10 + 16 + 8 + 6 + 12; // 106
      const raw = sum * 0.1051 + 2.585;
      const expected = Math.min(60, Math.max(1, raw));

      const measurements = {
        tricep: 10,
        chest: 12,
        subscapular: 14,
        abdominal: 18,
        suprailiac: 10,
        thigh: 16,
        midaxillary: 8,
        bicep: 6,
        lumbar: 12,
      };

      const maleResult = calculateBodyFat('9site', 'male', 30, measurements);
      const femaleResult = calculateBodyFat('9site', 'female', 30, measurements);

      expect(maleResult).not.toBeNull();
      expect(femaleResult).not.toBeNull();
      expect(maleResult as number).toBeCloseTo(expected, 5);
      expect(femaleResult as number).toBeCloseTo(expected, 5);
      expect(maleResult as number).toBeCloseTo(femaleResult as number, 10);
    });

    it('other returns bodyFatPct from measurements (clamped to [1,60])', () => {
      const result = calculateBodyFat('other', 'male', 30, { bodyFatPct: 22.5 });
      expect(result).toBeCloseTo(22.5, 5);
    });

    it('other clamps out-of-range value to [1,60]', () => {
      expect(calculateBodyFat('other', 'male', 30, { bodyFatPct: 0.5 })).toBe(1);
      expect(calculateBodyFat('other', 'male', 30, { bodyFatPct: 80 })).toBe(60);
    });
  });

  describe('calculateComposition', () => {
    it('returns matching fatMassKg and leanMassKg', () => {
      const result = calculateComposition(80, 20);
      expect(result.fatMassKg).toBeCloseTo(16, 10);
      expect(result.leanMassKg).toBeCloseTo(64, 10);
    });

    it('works at boundary values', () => {
      const result = calculateComposition(70, 15.5);
      const expectedFat = 70 * (15.5 / 100);
      expect(result.fatMassKg).toBeCloseTo(expectedFat, 10);
      expect(result.leanMassKg).toBeCloseTo(70 - expectedFat, 10);
    });
  });
});
