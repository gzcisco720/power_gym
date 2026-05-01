describe('planAssignedTemplate', () => {
  it('includes plan name in subject', () => {
    const { planAssignedTemplate } = require('@/lib/email/templates/plan-assigned') as typeof import('@/lib/email/templates/plan-assigned');
    const { subject } = planAssignedTemplate({ memberName: 'Alice', trainerName: 'Bob', planName: 'Push Pull Legs' });
    expect(subject).toContain('POWER GYM');
  });

  it('includes trainer name and plan name in html', () => {
    const { planAssignedTemplate } = require('@/lib/email/templates/plan-assigned') as typeof import('@/lib/email/templates/plan-assigned');
    const { html } = planAssignedTemplate({ memberName: 'Alice', trainerName: 'Bob', planName: 'Push Pull Legs' });
    expect(html).toContain('Bob');
    expect(html).toContain('Push Pull Legs');
  });
});

describe('nutritionAssignedTemplate', () => {
  it('includes plan name in subject', () => {
    const { nutritionAssignedTemplate } = require('@/lib/email/templates/nutrition-assigned') as typeof import('@/lib/email/templates/nutrition-assigned');
    const { subject } = nutritionAssignedTemplate({ memberName: 'Alice', trainerName: 'Bob', planName: 'Bulk Diet' });
    expect(subject).toContain('POWER GYM');
  });

  it('includes trainer name and plan name in html', () => {
    const { nutritionAssignedTemplate } = require('@/lib/email/templates/nutrition-assigned') as typeof import('@/lib/email/templates/nutrition-assigned');
    const { html } = nutritionAssignedTemplate({ memberName: 'Alice', trainerName: 'Bob', planName: 'Bulk Diet' });
    expect(html).toContain('Bob');
    expect(html).toContain('Bulk Diet');
  });
});

describe('memberAssignedTemplate', () => {
  it('single member: includes member name in html', () => {
    const { memberAssignedTemplate } = require('@/lib/email/templates/member-assigned') as typeof import('@/lib/email/templates/member-assigned');
    const { html } = memberAssignedTemplate({ trainerName: 'Bob', memberNames: ['Alice'], assignerName: 'Owner' });
    expect(html).toContain('Alice');
  });

  it('multiple members: includes count and list in html', () => {
    const { memberAssignedTemplate } = require('@/lib/email/templates/member-assigned') as typeof import('@/lib/email/templates/member-assigned');
    const { html } = memberAssignedTemplate({ trainerName: 'Bob', memberNames: ['Alice', 'Charlie'], assignerName: 'Owner' });
    expect(html).toContain('Alice');
    expect(html).toContain('Charlie');
  });
});

describe('sessionBookedTemplate', () => {
  it('single session: includes date in html', () => {
    const { sessionBookedTemplate } = require('@/lib/email/templates/session-booked') as typeof import('@/lib/email/templates/session-booked');
    const { html } = sessionBookedTemplate({ memberName: 'Alice', trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isRecurring: false });
    expect(html).toContain('May 5, 2026');
    expect(html).toContain('09:00');
  });

  it('recurring session: includes sessionCount in html', () => {
    const { sessionBookedTemplate } = require('@/lib/email/templates/session-booked') as typeof import('@/lib/email/templates/session-booked');
    const { html } = sessionBookedTemplate({ memberName: 'Alice', trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isRecurring: true, sessionCount: 12 });
    expect(html).toContain('12');
  });
});

describe('sessionCancelledTemplate', () => {
  it('single cancel: includes date in html', () => {
    const { sessionCancelledTemplate } = require('@/lib/email/templates/session-cancelled') as typeof import('@/lib/email/templates/session-cancelled');
    const { html } = sessionCancelledTemplate({ memberName: 'Alice', trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isSeries: false });
    expect(html).toContain('May 5, 2026');
  });

  it('series cancel: html indicates series', () => {
    const { sessionCancelledTemplate } = require('@/lib/email/templates/session-cancelled') as typeof import('@/lib/email/templates/session-cancelled');
    const { html } = sessionCancelledTemplate({ memberName: 'Alice', trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isSeries: true });
    expect(html).toContain('09:00');
  });
});
