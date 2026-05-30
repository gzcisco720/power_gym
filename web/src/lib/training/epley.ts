// Epley formula: weight × (1 + reps / 30)
export function estimatedOneRM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}
