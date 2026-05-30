interface ThreeSiteMaleInput {
  protocol: '3site';
  sex: 'male';
  age: number;
  chest: number;
  abdominal: number;
  thigh: number;
}

interface ThreeSiteFemaleInput {
  protocol: '3site';
  sex: 'female';
  age: number;
  tricep: number;
  suprailiac: number;
  thigh: number;
}

interface SevenSiteInput {
  protocol: '7site';
  sex: 'male' | 'female';
  age: number;
  chest: number;
  midaxillary: number;
  tricep: number;
  subscapular: number;
  abdominal: number;
  suprailiac: number;
  thigh: number;
}

/**
 * 9-site Parrillo formula input. Sex and age are carried for record-keeping purposes
 * but are not used in the Parrillo body fat calculation, which treats all individuals
 * the same regardless of sex or age.
 */
interface NineSiteInput {
  protocol: '9site';
  sex: 'male' | 'female';
  age: number;
  tricep: number;
  chest: number;
  subscapular: number;
  abdominal: number;
  suprailiac: number;
  thigh: number;
  midaxillary: number;
  bicep: number;
  lumbar: number;
}

interface OtherInput {
  protocol: 'other';
  bodyFatPct: number;
}

export type BodyFatInput =
  | ThreeSiteMaleInput
  | ThreeSiteFemaleInput
  | SevenSiteInput
  | NineSiteInput
  | OtherInput;

export interface CompositionResult {
  fatMassKg: number;
  leanMassKg: number;
}

function siriEquation(density: number): number {
  return 495 / density - 450;
}

export function calculateBodyFat(input: BodyFatInput): number {
  if (input.protocol === 'other') {
    return input.bodyFatPct;
  }

  if (input.protocol === '3site') {
    if (input.sex === 'male') {
      const sum = input.chest + input.abdominal + input.thigh;
      const density =
        1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * input.age;
      return siriEquation(density);
    } else {
      const sum = input.tricep + input.suprailiac + input.thigh;
      const density =
        1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * input.age;
      return siriEquation(density);
    }
  }

  if (input.protocol === '7site') {
    const sum =
      input.chest +
      input.midaxillary +
      input.tricep +
      input.subscapular +
      input.abdominal +
      input.suprailiac +
      input.thigh;
    if (input.sex === 'male') {
      const density =
        1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * input.age;
      return siriEquation(density);
    } else {
      const density =
        1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * input.age;
      return siriEquation(density);
    }
  }

  if (input.protocol === '9site') {
    // Parrillo formula — no gender or age distinction
    const sum =
      input.tricep +
      input.chest +
      input.subscapular +
      input.abdominal +
      input.suprailiac +
      input.thigh +
      input.midaxillary +
      input.bicep +
      input.lumbar;
    return sum * 0.1051 + 2.585;
  }

  const _exhaustive: never = input;
  throw new Error(`Unhandled protocol: ${JSON.stringify(_exhaustive)}`);
}

export function calculateComposition(weightKg: number, bodyFatPct: number): CompositionResult {
  const fatMassKg = weightKg * (bodyFatPct / 100);
  const leanMassKg = weightKg - fatMassKg;
  return { fatMassKg, leanMassKg };
}
