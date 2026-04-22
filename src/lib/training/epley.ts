/**
 * Estimates one-repetition maximum (1RM) using the Epley formula.
 *
 * Formula: weight × (1 + reps / 30)
 *
 * @param weight - The weight lifted in kg (or any unit)
 * @param reps - The number of repetitions performed
 * @returns Estimated 1RM in the same unit as weight
 */
export function estimatedOneRM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}
