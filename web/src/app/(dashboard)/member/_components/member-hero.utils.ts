export function estimatedDuration(totalSets: number): number {
  return Math.max(15, Math.ceil((totalSets * 2.5) / 5) * 5);
}
