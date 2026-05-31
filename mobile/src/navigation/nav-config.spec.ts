import { NAV_CONFIG } from './nav-config';

describe('nav-config', () => {
  describe('NAV_CONFIG.owner', () => {
    it('contains a GYM group whose items include Equipment, Services, and Billing', () => {
      const gymGroup = NAV_CONFIG.owner.find((g) => g.label === 'GYM');
      expect(gymGroup).toBeDefined();
      const keys = gymGroup!.items.map((i) => i.key);
      expect(keys).toContain('Equipment');
      expect(keys).toContain('Services');
      expect(keys).toContain('Billing');
    });
  });

  describe('NAV_CONFIG.member', () => {
    it('does not contain a Trainers or Equipment item', () => {
      const allKeys = NAV_CONFIG.member.flatMap((g) => g.items.map((i) => i.key));
      expect(allKeys).not.toContain('Trainers');
      expect(allKeys).not.toContain('Equipment');
    });
  });

  describe('NAV_CONFIG.trainer', () => {
    it('Dashboard is the first item under the OVERVIEW group', () => {
      const overviewGroup = NAV_CONFIG.trainer.find((g) => g.label === 'OVERVIEW');
      expect(overviewGroup).toBeDefined();
      expect(overviewGroup!.items[0].key).toBe('Dashboard');
    });
  });
});
