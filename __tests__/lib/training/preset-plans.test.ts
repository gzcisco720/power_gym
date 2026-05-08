import { PRESET_PLANS, getPresetPlan, isPresetKey } from '@/lib/training/preset-plans';

describe('preset plans', () => {
  it('exposes 3 preset frameworks', () => {
    expect(Object.keys(PRESET_PLANS)).toEqual(['ppl', 'upper-lower', 'full-body']);
  });

  it('each preset has name, summary, dayCount, days[] with name + empty exercises', () => {
    for (const key of Object.keys(PRESET_PLANS)) {
      const p = PRESET_PLANS[key];
      expect(p.name).toBeTruthy();
      expect(p.summary).toBeTruthy();
      expect(p.dayCount).toBeGreaterThan(0);
      expect(p.days).toHaveLength(p.dayCount);
      for (const d of p.days) {
        expect(d.name).toBeTruthy();
        expect(Array.isArray(d.exercises)).toBe(true);
        expect(d.exercises).toHaveLength(0);
      }
    }
  });

  it('isPresetKey narrows correctly', () => {
    expect(isPresetKey('ppl')).toBe(true);
    expect(isPresetKey('nope')).toBe(false);
  });

  it('getPresetPlan returns null for unknown key', () => {
    expect(getPresetPlan('nope')).toBeNull();
    expect(getPresetPlan('ppl')?.name).toBe('Push · Pull · Legs');
  });
});
