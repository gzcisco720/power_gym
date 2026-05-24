export interface LastWeightHintDTO {
  exerciseId: string;
  lastWeight: number;
  lastReps: number;
  lastDate: string; // ISO string from API
  consecutiveMaxHits: number; // 0 | 1 | 2
}

/** 5% of current weight, rounded to nearest 0.5 kg, min 0.5 kg, capped at 5 kg. */
export function suggestedIncrement(currentWeight: number): number {
  const raw = currentWeight * 0.05;
  const rounded = Math.round(raw / 0.5) * 0.5;
  return Math.max(0.5, Math.min(rounded, 5));
}

export function suggestedWeight(currentWeight: number): number {
  return currentWeight + suggestedIncrement(currentWeight);
}

/**
 * Formats a hint date: weekday name if within 6 days, otherwise "D Mon".
 */
export function formatHintDate(date: Date): string {
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (daysDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}
