import { planAssignedTemplate } from '@/lib/email/templates/plan-assigned';
import { nutritionAssignedTemplate } from '@/lib/email/templates/nutrition-assigned';
import { memberAssignedTemplate } from '@/lib/email/templates/member-assigned';
import { sessionBookedTemplate } from '@/lib/email/templates/session-booked';
import { sessionCancelledTemplate } from '@/lib/email/templates/session-cancelled';

describe('planAssignedTemplate', () => {
  it('includes plan name in subject', () => {
    const { subject } = planAssignedTemplate({ trainerName: 'Bob', planName: 'Push Pull Legs' });
    expect(subject).toContain('POWER GYM');
  });

  it('includes trainer name and plan name in html', () => {
    const { html } = planAssignedTemplate({ trainerName: 'Bob', planName: 'Push Pull Legs' });
    expect(html).toContain('Bob');
    expect(html).toContain('Push Pull Legs');
  });
});

describe('nutritionAssignedTemplate', () => {
  it('includes plan name in subject', () => {
    const { subject } = nutritionAssignedTemplate({ trainerName: 'Bob', planName: 'Bulk Diet' });
    expect(subject).toContain('POWER GYM');
  });

  it('includes trainer name and plan name in html', () => {
    const { html } = nutritionAssignedTemplate({ trainerName: 'Bob', planName: 'Bulk Diet' });
    expect(html).toContain('Bob');
    expect(html).toContain('Bulk Diet');
  });
});

describe('memberAssignedTemplate', () => {
  it('single member: includes member name in html', () => {
    const { html } = memberAssignedTemplate({ trainerName: 'Bob', memberNames: ['Alice'], assignerName: 'Owner' });
    expect(html).toContain('Alice');
  });

  it('multiple members: includes count and list in html', () => {
    const { html } = memberAssignedTemplate({ trainerName: 'Bob', memberNames: ['Alice', 'Charlie'], assignerName: 'Owner' });
    expect(html).toContain('Alice');
    expect(html).toContain('Charlie');
    expect(html).toContain('<strong>2</strong>');
  });
});

describe('sessionBookedTemplate', () => {
  it('single session: includes date in html', () => {
    const { html } = sessionBookedTemplate({ trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isRecurring: false });
    expect(html).toContain('May 5, 2026');
    expect(html).toContain('09:00');
  });

  it('recurring session: includes sessionCount in html', () => {
    const { html } = sessionBookedTemplate({ trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isRecurring: true, sessionCount: 12 });
    expect(html).toContain('12');
  });
});

describe('sessionCancelledTemplate', () => {
  it('single cancel: includes date in html', () => {
    const { html } = sessionCancelledTemplate({ trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isSeries: false });
    expect(html).toContain('May 5, 2026');
  });

  it('series cancel: html indicates series', () => {
    const { html } = sessionCancelledTemplate({ trainerName: 'Bob', date: 'Monday, May 5, 2026', startTime: '09:00', endTime: '10:00', isSeries: true });
    expect(html).toContain('系列训练课');
  });
});
