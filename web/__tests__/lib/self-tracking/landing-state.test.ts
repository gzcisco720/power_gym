import { detectLandingState } from '@/lib/self-tracking/landing-state';

describe('detectLandingState', () => {
  it('returns empty when no completed sessions', () => {
    expect(detectLandingState({ completedSessionCount: 0, hasUsedTemplate: false })).toBe('empty');
  });

  it('returns light when 1-3 sessions', () => {
    expect(detectLandingState({ completedSessionCount: 1, hasUsedTemplate: true })).toBe('light');
    expect(detectLandingState({ completedSessionCount: 3, hasUsedTemplate: false })).toBe('light');
  });

  it('returns light when 4+ sessions but never used a template', () => {
    expect(detectLandingState({ completedSessionCount: 7, hasUsedTemplate: false })).toBe('light');
  });

  it('returns full when 4+ sessions and at least one used a template', () => {
    expect(detectLandingState({ completedSessionCount: 4, hasUsedTemplate: true })).toBe('full');
  });
});
