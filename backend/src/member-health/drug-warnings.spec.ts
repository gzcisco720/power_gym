import { getDrugWarning } from './drug-warnings';

describe('getDrugWarning', () => {
  it('returns the correct warning for a known keyword', () => {
    const result = getDrugWarning('metoprolol');
    expect(result).toBe(
      'Beta blocker — use RPE instead of HR to set intensity',
    );
  });

  it('matches case-insensitively', () => {
    const result = getDrugWarning('Metoprolol XL 25mg');
    expect(result).toBe(
      'Beta blocker — use RPE instead of HR to set intensity',
    );
  });

  it('matches a substring', () => {
    const result = getDrugWarning('atorvastatin 20mg');
    expect(result).toContain('monitor for unusual muscle soreness');
  });

  it('returns null for an unknown medication', () => {
    const result = getDrugWarning('amoxicillin');
    expect(result).toBeNull();
  });
});
