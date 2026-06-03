import { Protocol, Sex } from '../types/body-tests';

export interface CompositionResult {
  fatMassKg: number;
  leanMassKg: number;
}

function siriEquation(density: number): number {
  return 495 / density - 450;
}

function clamp(value: number): number {
  return Math.min(60, Math.max(1, value));
}

function isDefined(v: number | undefined): v is number {
  return v !== undefined && !Number.isNaN(v);
}

/**
 * Calculate body fat percentage from skinfold measurements.
 * Returns null when any required site for the protocol is missing or NaN.
 * Applies [1, 60] clamp — identical to the backend service.
 */
export function calculateBodyFat(
  protocol: Protocol,
  sex: Sex,
  age: number,
  measurements: Record<string, number | undefined>,
): number | null {
  if (protocol === 'other') {
    const pct = measurements['bodyFatPct'];
    if (!isDefined(pct)) return null;
    return clamp(pct);
  }

  if (protocol === '3site') {
    if (sex === 'male') {
      const chest = measurements['chest'];
      const abdominal = measurements['abdominal'];
      const thigh = measurements['thigh'];
      if (!isDefined(chest) || !isDefined(abdominal) || !isDefined(thigh)) return null;
      const sum = chest + abdominal + thigh;
      const density =
        1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age;
      return clamp(siriEquation(density));
    } else {
      const tricep = measurements['tricep'];
      const suprailiac = measurements['suprailiac'];
      const thigh = measurements['thigh'];
      if (!isDefined(tricep) || !isDefined(suprailiac) || !isDefined(thigh)) return null;
      const sum = tricep + suprailiac + thigh;
      const density =
        1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * age;
      return clamp(siriEquation(density));
    }
  }

  if (protocol === '7site') {
    const chest = measurements['chest'];
    const midaxillary = measurements['midaxillary'];
    const tricep = measurements['tricep'];
    const subscapular = measurements['subscapular'];
    const abdominal = measurements['abdominal'];
    const suprailiac = measurements['suprailiac'];
    const thigh = measurements['thigh'];
    if (
      !isDefined(chest) ||
      !isDefined(midaxillary) ||
      !isDefined(tricep) ||
      !isDefined(subscapular) ||
      !isDefined(abdominal) ||
      !isDefined(suprailiac) ||
      !isDefined(thigh)
    ) {
      return null;
    }
    const sum = chest + midaxillary + tricep + subscapular + abdominal + suprailiac + thigh;
    if (sex === 'male') {
      const density =
        1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age;
      return clamp(siriEquation(density));
    } else {
      const density =
        1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age;
      return clamp(siriEquation(density));
    }
  }

  if (protocol === '9site') {
    const tricep = measurements['tricep'];
    const chest = measurements['chest'];
    const subscapular = measurements['subscapular'];
    const abdominal = measurements['abdominal'];
    const suprailiac = measurements['suprailiac'];
    const thigh = measurements['thigh'];
    const midaxillary = measurements['midaxillary'];
    const bicep = measurements['bicep'];
    const lumbar = measurements['lumbar'];
    if (
      !isDefined(tricep) ||
      !isDefined(chest) ||
      !isDefined(subscapular) ||
      !isDefined(abdominal) ||
      !isDefined(suprailiac) ||
      !isDefined(thigh) ||
      !isDefined(midaxillary) ||
      !isDefined(bicep) ||
      !isDefined(lumbar)
    ) {
      return null;
    }
    const sum =
      tricep + chest + subscapular + abdominal + suprailiac + thigh + midaxillary + bicep + lumbar;
    return clamp(sum * 0.1051 + 2.585);
  }

  return null;
}

export function calculateComposition(weight: number, bodyFatPct: number): CompositionResult {
  const fatMassKg = weight * (bodyFatPct / 100);
  const leanMassKg = weight - fatMassKg;
  return { fatMassKg, leanMassKg };
}
