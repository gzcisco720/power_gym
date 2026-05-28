import {
  evaluateMilestone,
  selectEmoji,
  buildMilestoneTitle,
  type BodyTestSnapshot,
} from '@/lib/journey/milestone-calculator';

function makeTest(overrides: Partial<BodyTestSnapshot> = {}): BodyTestSnapshot {
  return {
    date: new Date('2024-01-01'),
    bodyFatPct: 22.0,
    weight: 75.0,
    leanMassKg: 58.5,
    targetBodyFatPct: null,
    targetWeight: null,
    ...overrides,
  };
}

const NO_CHECKINS: Date[] = [];

describe('evaluateMilestone', () => {
  it('returns time_milestone trigger for the very first test (index 0)', () => {
    const tests = [makeTest()];
    const triggers = evaluateMilestone(0, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('time_milestone');
  });

  it('returns no triggers for a second test with no notable changes', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 22.0, weight: 75.0, leanMassKg: 58.5 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 22.0, weight: 74.9, leanMassKg: 58.5 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers).toHaveLength(0);
  });

  it('returns significant_change when body fat drops >= 1%', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 23.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 21.9 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('significant_change');
  });

  it('does NOT return significant_change when drop is < 1%', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 22.5 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 21.6 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).not.toContain('significant_change');
  });

  it('returns personal_best when new lowest body fat % is achieved', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 23.0, leanMassKg: 57.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 22.5, leanMassKg: 58.0 }),
      makeTest({ date: new Date('2024-03-01'), bodyFatPct: 22.0, leanMassKg: 58.5 }),
    ];
    const triggers = evaluateMilestone(2, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('personal_best');
  });

  it('does NOT return personal_best when body fat is not the lowest ever', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 21.0, leanMassKg: 59.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 22.5, leanMassKg: 58.0 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).not.toContain('personal_best');
  });

  it('returns goal_reached when bodyFatPct <= targetBodyFatPct for the first time', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 23.0, targetBodyFatPct: 20.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 19.5, targetBodyFatPct: 20.0 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('goal_reached');
  });

  it('does NOT return goal_reached if a previous test already reached the goal', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 19.0, targetBodyFatPct: 20.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 19.5, targetBodyFatPct: 20.0 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).not.toContain('goal_reached');
  });

  it('returns time_milestone for test near 3-month anniversary', () => {
    const first = new Date('2024-01-01');
    const threeMonths = new Date('2024-04-03'); // within ±7 days of Apr 1
    const tests = [
      makeTest({ date: first }),
      makeTest({ date: threeMonths }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).toContain('time_milestone');
  });

  it('does NOT return time_milestone when test is more than 7 days away from anniversary', () => {
    const first = new Date('2024-01-01');
    const notAnniversary = new Date('2024-04-15'); // 14 days after 3-month mark
    const tests = [
      makeTest({ date: first }),
      makeTest({ date: notAnniversary }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    expect(triggers.map(t => t.type)).not.toContain('time_milestone');
  });

  it('returns checkin_streak when 30th check-in date is within ±7 days of test', () => {
    const testDate = new Date('2024-03-01');
    // 29 check-ins all before February (guaranteed to be earlier than March 3 after sort)
    const checkInDates: Date[] = Array.from({ length: 29 }, (_, i) => {
      const d = new Date('2024-01-01');
      d.setDate(d.getDate() + i * 2); // every 2 days: Jan 1 through Feb 26
      return d;
    });
    // 30th check-in is 2 days after the body test — this will be index 29 after sort
    checkInDates.push(new Date('2024-03-03'));
    checkInDates.sort((a, b) => a.getTime() - b.getTime());
    const tests = [makeTest({ date: testDate })];
    const triggers = evaluateMilestone(0, tests, checkInDates);
    expect(triggers.map(t => t.type)).toContain('checkin_streak');
  });

  it('returns multiple triggers when several conditions fire simultaneously', () => {
    const tests = [
      makeTest({ date: new Date('2024-01-01'), bodyFatPct: 23.0, leanMassKg: 57.0, targetBodyFatPct: 20.0 }),
      makeTest({ date: new Date('2024-02-01'), bodyFatPct: 19.5, leanMassKg: 59.0, targetBodyFatPct: 20.0 }),
    ];
    const triggers = evaluateMilestone(1, tests, NO_CHECKINS);
    const types = triggers.map(t => t.type);
    expect(types).toContain('goal_reached');
    expect(types).toContain('personal_best');
    expect(types).toContain('significant_change');
  });
});

describe('selectEmoji', () => {
  it('returns 🏆 when goal_reached is present', () => {
    expect(selectEmoji([{ type: 'goal_reached', label: '', color: 'gold' }])).toBe('🏆');
  });
  it('returns 🌟 when time_milestone is present (no goal_reached)', () => {
    expect(selectEmoji([{ type: 'time_milestone', label: '', color: 'indigo' }])).toBe('🌟');
  });
  it('returns 🥇 for personal_best only', () => {
    expect(selectEmoji([{ type: 'personal_best', label: '', color: 'indigo' }])).toBe('🥇');
  });
});

describe('buildMilestoneTitle', () => {
  it('returns goal title when goal_reached present', () => {
    const title = buildMilestoneTitle([{ type: 'goal_reached', label: '目标达成', color: 'gold' }]);
    expect(title).toBe('Goal achieved');
  });
  it('uses label for time_milestone', () => {
    const title = buildMilestoneTitle([{ type: 'time_milestone', label: '3-month milestone', color: 'indigo' }]);
    expect(title).toBe('3-month milestone');
  });
});
