import { calculateBodyFat, calculateComposition } from '@/lib/body-test/formulas';

describe('calculateBodyFat — 3-site male (Jackson-Pollock)', () => {
  it('returns correct BF% for known inputs', () => {
    // chest=10, abdominal=20, thigh=15, age=30
    // sum3=45, density=1.10938-0.0008267*45+0.0000016*45²-0.0002574*30
    // density ≈ 1.10938-0.037202+0.00324-0.007722 = 1.067696
    // BF% = 495/1.067696 - 450 ≈ 13.61
    const result = calculateBodyFat({
      protocol: '3site',
      sex: 'male',
      age: 30,
      chest: 10,
      abdominal: 20,
      thigh: 15,
    });
    expect(result).toBeCloseTo(13.61, 1);
  });
});

describe('calculateBodyFat — 3-site female (Jackson-Pollock)', () => {
  it('returns correct BF% for known inputs', () => {
    // tricep=15, suprailiac=18, thigh=20, age=25
    // sum3=53
    // density=1.0994921-0.0009929*53+0.0000023*53²-0.0001392*25
    // density ≈ 1.0994921-0.052624+0.006459-0.003480 = 1.049848
    // BF% = 495/1.049848 - 450 ≈ 21.50
    const result = calculateBodyFat({
      protocol: '3site',
      sex: 'female',
      age: 25,
      tricep: 15,
      suprailiac: 18,
      thigh: 20,
    });
    expect(result).toBeCloseTo(21.50, 1);
  });
});

describe('calculateBodyFat — 7-site male (Jackson-Pollock)', () => {
  it('returns correct BF% for known inputs', () => {
    // sum7=100, age=35
    // density=1.112-0.00043499*100+0.00000055*100²-0.00028826*35
    // density ≈ 1.112-0.043499+0.0055-0.010089 = 1.063912
    // BF% = 495/1.063912 - 450 ≈ 15.25
    const result = calculateBodyFat({
      protocol: '7site',
      sex: 'male',
      age: 35,
      chest: 15,
      midaxillary: 12,
      tricep: 13,
      subscapular: 14,
      abdominal: 18,
      suprailiac: 16,
      thigh: 12,
    });
    expect(result).toBeCloseTo(15.25, 1);
  });
});

describe('calculateBodyFat — 7-site female (Jackson-Pollock)', () => {
  it('returns correct BF% for known inputs', () => {
    // sum7=100, age=30
    // density=1.097-0.00046971*100+0.00000056*100²-0.00012828*30
    // density ≈ 1.097-0.046971+0.0056-0.003849 = 1.05178
    // BF% = 495/1.05178 - 450 ≈ 20.63
    const result = calculateBodyFat({
      protocol: '7site',
      sex: 'female',
      age: 30,
      chest: 15,
      midaxillary: 12,
      tricep: 13,
      subscapular: 14,
      abdominal: 18,
      suprailiac: 16,
      thigh: 12,
    });
    expect(result).toBeCloseTo(20.63, 1);
  });
});

describe('calculateBodyFat — 9-site Parrillo', () => {
  it('returns correct BF% regardless of sex', () => {
    // sum9=120: BF% = 120*0.1051+2.585 = 12.612+2.585 = 15.197
    const maleResult = calculateBodyFat({
      protocol: '9site',
      sex: 'male',
      age: 30,
      tricep: 12,
      chest: 14,
      subscapular: 13,
      abdominal: 16,
      suprailiac: 14,
      thigh: 13,
      midaxillary: 12,
      bicep: 13,
      lumbar: 13,
    });
    expect(maleResult).toBeCloseTo(15.197, 2);

    // Verify same result with female sex to confirm sex-independence
    const femaleResult = calculateBodyFat({
      protocol: '9site',
      sex: 'female',
      age: 30,
      tricep: 12,
      chest: 14,
      subscapular: 13,
      abdominal: 16,
      suprailiac: 14,
      thigh: 13,
      midaxillary: 12,
      bicep: 13,
      lumbar: 13,
    });
    expect(femaleResult).toBeCloseTo(15.197, 2);
  });
});

describe('calculateBodyFat — other protocol', () => {
  it('returns the provided bodyFatPct directly', () => {
    const result = calculateBodyFat({ protocol: 'other', bodyFatPct: 22.5 });
    expect(result).toBe(22.5);
  });
});

describe('calculateComposition', () => {
  it('calculates fatMassKg and leanMassKg from weight and BF%', () => {
    const result = calculateComposition(80, 20);
    expect(result.fatMassKg).toBeCloseTo(16);
    expect(result.leanMassKg).toBeCloseTo(64);
  });

  it('handles 0% body fat edge case', () => {
    const result = calculateComposition(70, 0);
    expect(result.fatMassKg).toBeCloseTo(0);
    expect(result.leanMassKg).toBeCloseTo(70);
  });
});
