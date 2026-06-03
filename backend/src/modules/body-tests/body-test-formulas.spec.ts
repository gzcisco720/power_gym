import {
  calculateBodyFat,
  calculateComposition,
  BodyFatInput,
} from './body-test-formulas';

describe('body-test-formulas', () => {
  describe('calculateBodyFat', () => {
    it('3site male (chest/abdominal/thigh) returns Siri-equation value matching JP density formula', () => {
      // Known input: chest=10, abdominal=20, thigh=15, age=30
      const input: BodyFatInput = {
        protocol: '3site',
        sex: 'male',
        age: 30,
        chest: 10,
        abdominal: 20,
        thigh: 15,
      };
      const sum = 10 + 20 + 15; // 45
      const density =
        1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * 30;
      const expected = 495 / density - 450;

      expect(calculateBodyFat(input)).toBeCloseTo(expected, 5);
    });

    it('3site female (tricep/suprailiac/thigh) returns female-density Siri value', () => {
      // Known input: tricep=15, suprailiac=12, thigh=20, age=25
      const input: BodyFatInput = {
        protocol: '3site',
        sex: 'female',
        age: 25,
        tricep: 15,
        suprailiac: 12,
        thigh: 20,
      };
      const sum = 15 + 12 + 20; // 47
      const density =
        1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * 25;
      const expected = 495 / density - 450;

      expect(calculateBodyFat(input)).toBeCloseTo(expected, 5);
    });

    it('7site male returns JP-7 density Siri value', () => {
      const input: BodyFatInput = {
        protocol: '7site',
        sex: 'male',
        age: 35,
        chest: 10,
        midaxillary: 8,
        tricep: 12,
        subscapular: 14,
        abdominal: 20,
        suprailiac: 10,
        thigh: 15,
      };
      const sum = 10 + 8 + 12 + 14 + 20 + 10 + 15; // 89
      const density =
        1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * 35;
      const expected = 495 / density - 450;

      expect(calculateBodyFat(input)).toBeCloseTo(expected, 5);
    });

    it('7site female returns female JP-7 density Siri value', () => {
      const input: BodyFatInput = {
        protocol: '7site',
        sex: 'female',
        age: 28,
        chest: 10,
        midaxillary: 8,
        tricep: 12,
        subscapular: 14,
        abdominal: 20,
        suprailiac: 10,
        thigh: 15,
      };
      const sum = 10 + 8 + 12 + 14 + 20 + 10 + 15; // 89
      const density =
        1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * 28;
      const expected = 495 / density - 450;

      expect(calculateBodyFat(input)).toBeCloseTo(expected, 5);
    });

    it('9site Parrillo returns sum*0.1051 + 2.585, identical for male and female', () => {
      const maleInput: BodyFatInput = {
        protocol: '9site',
        sex: 'male',
        age: 30,
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
      const femaleInput: BodyFatInput = {
        protocol: '9site',
        sex: 'female',
        age: 30,
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
      const sum = 10 + 12 + 14 + 18 + 10 + 16 + 8 + 6 + 12; // 106
      const expected = sum * 0.1051 + 2.585;

      const maleResult = calculateBodyFat(maleInput);
      const femaleResult = calculateBodyFat(femaleInput);

      expect(maleResult).toBeCloseTo(expected, 5);
      expect(femaleResult).toBeCloseTo(expected, 5);
      expect(maleResult).toBeCloseTo(femaleResult, 10);
    });

    it('other returns the supplied bodyFatPct unchanged', () => {
      const input: BodyFatInput = { protocol: 'other', bodyFatPct: 22.5 };

      expect(calculateBodyFat(input)).toBe(22.5);
    });
  });

  describe('calculateComposition', () => {
    it('returns fatMassKg = weight*(pct/100) and leanMassKg = weight - fatMassKg', () => {
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
