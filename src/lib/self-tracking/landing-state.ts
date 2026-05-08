export type LandingState = 'full' | 'light' | 'empty';

interface DetectInput {
  completedSessionCount: number;
  hasUsedTemplate: boolean;
}

export function detectLandingState(input: DetectInput): LandingState {
  if (input.completedSessionCount === 0) return 'empty';
  if (input.completedSessionCount >= 4 && input.hasUsedTemplate) return 'full';
  return 'light';
}
