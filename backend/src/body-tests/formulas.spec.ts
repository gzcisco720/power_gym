import 'reflect-metadata';
import { calculateBodyFat, calculateComposition } from './formulas';

describe('calculateBodyFat', () => {
  describe('3-site male', () => {
    it('returns known body-fat % within 0.01 tolerance', () => {
      // chest=15, abdominal=20, thigh=18, age=30
      const sum = 15 + 20 + 18; // 53
      const density =
        1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * 30;
      const expected = 495 / density - 450;
      const result = calculateBodyFat({
        protocol: '3site',
        sex: 'male',
        age: 30,
        chest: 15,
        abdominal: 20,
        thigh: 18,
      });
      expect(result).toBeCloseTo(expected, 2);
    });
  });

  describe('3-site female', () => {
    it('returns known body-fat % within 0.01 tolerance', () => {
      // tricep=18, suprailiac=22, thigh=25, age=28
      const sum = 18 + 22 + 25; // 65
      const density =
        1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * 28;
      const expected = 495 / density - 450;
      const result = calculateBodyFat({
        protocol: '3site',
        sex: 'female',
        age: 28,
        tricep: 18,
        suprailiac: 22,
        thigh: 25,
      });
      expect(result).toBeCloseTo(expected, 2);
    });
  });

  describe('7-site male', () => {
    it('returns known body-fat % within 0.01 tolerance', () => {
      // values chosen so sum=70: chest=10, midaxillary=10, tricep=10, subscapular=10, abdominal=10, suprailiac=10, thigh=10
      const sum = 70;
      const age = 25;
      const density =
        1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age;
      const expected = 495 / density - 450;
      const result = calculateBodyFat({
        protocol: '7site',
        sex: 'male',
        age,
        chest: 10,
        midaxillary: 10,
        tricep: 10,
        subscapular: 10,
        abdominal: 10,
        suprailiac: 10,
        thigh: 10,
      });
      expect(result).toBeCloseTo(expected, 2);
    });
  });

  describe('7-site female', () => {
    it('returns known body-fat % within 0.01 tolerance', () => {
      const sum = 70;
      const age = 25;
      const density =
        1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age;
      const expected = 495 / density - 450;
      const result = calculateBodyFat({
        protocol: '7site',
        sex: 'female',
        age,
        chest: 10,
        midaxillary: 10,
        tricep: 10,
        subscapular: 10,
        abdominal: 10,
        suprailiac: 10,
        thigh: 10,
      });
      expect(result).toBeCloseTo(expected, 2);
    });
  });

  describe('9-site (Parrillo)', () => {
    it('returns sum × 0.1051 + 2.585', () => {
      // 9 sites each = 100/9 ≈ so we just use explicit values summing to 100
      const result = calculateBodyFat({
        protocol: '9site',
        sex: 'male',
        age: 30,
        tricep: 12,
        chest: 11,
        subscapular: 11,
        abdominal: 12,
        suprailiac: 11,
        thigh: 11,
        midaxillary: 11,
        bicep: 10,
        lumbar: 11,
      });
      const sum = 12 + 11 + 11 + 12 + 11 + 11 + 11 + 10 + 11; // 100
      expect(result).toBeCloseTo(sum * 0.1051 + 2.585, 4);
    });
  });

  describe('other', () => {
    it('returns bodyFatPct unchanged', () => {
      const result = calculateBodyFat({ protocol: 'other', bodyFatPct: 18.5 });
      expect(result).toBe(18.5);
    });
  });
});

describe('calculateComposition', () => {
  it('returns fatMassKg = weight × (pct / 100) and leanMassKg = weight − fatMassKg', () => {
    const { fatMassKg, leanMassKg } = calculateComposition(80, 20);
    expect(fatMassKg).toBe(16);
    expect(leanMassKg).toBe(64);
  });
});
