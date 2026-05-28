import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { NodemailerProvider } from './providers/nodemailer.provider';
import { MailgunProvider } from './providers/mailgun.provider';

// Template smoke-test imports
import { inviteEmailTemplate } from './templates/invite';
import { sessionReminderTemplate } from './templates/session-reminder';
import { planAssignedTemplate } from './templates/plan-assigned';
import { nutritionAssignedTemplate } from './templates/nutrition-assigned';
import { memberAssignedTemplate } from './templates/member-assigned';
import { sessionBookedTemplate } from './templates/session-booked';
import { sessionCancelledTemplate } from './templates/session-cancelled';
import { checkInReminderTemplate } from './templates/check-in-reminder';
import { checkInReceivedTemplate } from './templates/check-in-received';
import { passwordResetEmailTemplate } from './templates/password-reset';

function makeConfig(provider: string): ConfigService {
  return {
    get: (key: string) => {
      if (key === 'EMAIL_PROVIDER') return provider;
      if (key === 'SMTP_FROM') return 'test@example.com';
      if (key === 'SMTP_HOST') return 'localhost';
      if (key === 'SMTP_PORT') return '1025';
      return undefined;
    },
    getOrThrow: (key: string) => {
      if (key === 'MAILGUN_API_KEY') return 'key-test';
      if (key === 'MAILGUN_DOMAIN') return 'mg.example.com';
      throw new Error(`Missing required config: ${key}`);
    },
  } as unknown as ConfigService;
}

describe('EmailService provider selection', () => {
  it('resolves NodemailerProvider when EMAIL_PROVIDER=smtp', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: makeConfig('smtp') },
      ],
    }).compile();
    const service = module.get(EmailService);
    expect(
      (service as unknown as { provider: unknown }).provider,
    ).toBeInstanceOf(NodemailerProvider);
  });

  it('resolves MailgunProvider when EMAIL_PROVIDER=mailgun', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: makeConfig('mailgun') },
      ],
    }).compile();
    const service = module.get(EmailService);
    expect(
      (service as unknown as { provider: unknown }).provider,
    ).toBeInstanceOf(MailgunProvider);
  });
});

describe('Email templates render correctly', () => {
  it('invite: subject truthy, html contains inviteUrl', () => {
    const { subject, html } = inviteEmailTemplate({
      inviterName: 'Coach Bob',
      role: 'member',
      inviteUrl: 'https://app.example.com/register?token=abc123',
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('abc123');
  });

  it('session-reminder: subject truthy, html contains memberName', () => {
    const { subject, html } = sessionReminderTemplate({
      memberName: 'Alice',
      trainerName: 'Bob',
      date: 'Monday, May 5, 2026',
      startTime: '09:00',
      endTime: '10:00',
      groupMembers: [],
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('Alice');
  });

  it('plan-assigned: subject truthy, html contains planName', () => {
    const { subject, html } = planAssignedTemplate({
      trainerName: 'Bob',
      planName: 'Hypertrophy Block 1',
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('Hypertrophy Block 1');
  });

  it('nutrition-assigned: subject truthy, html contains planName', () => {
    const { subject, html } = nutritionAssignedTemplate({
      trainerName: 'Bob',
      planName: 'Cut Phase Nutrition',
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('Cut Phase Nutrition');
  });

  it('member-assigned: subject truthy, html contains memberName', () => {
    const { subject, html } = memberAssignedTemplate({
      trainerName: 'Bob',
      memberNames: ['Alice'],
      assignerName: 'Owner',
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('Alice');
  });

  it('session-booked: subject truthy, html contains trainerName', () => {
    const { subject, html } = sessionBookedTemplate({
      trainerName: 'Bob',
      date: 'Monday, June 1, 2026',
      startTime: '09:00',
      endTime: '10:00',
      isRecurring: false,
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('Bob');
  });

  it('session-cancelled: subject truthy, html contains date', () => {
    const { subject, html } = sessionCancelledTemplate({
      trainerName: 'Bob',
      date: 'Monday, June 1, 2026',
      startTime: '09:00',
      endTime: '10:00',
      isSeries: false,
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('June 1, 2026');
  });

  it('check-in-reminder: subject truthy, html contains checkInUrl token', () => {
    const { subject, html } = checkInReminderTemplate({
      memberName: 'Alice',
      trainerName: 'Bob',
      checkInUrl: 'https://app.example.com/member/check-in?tok=xyz',
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('xyz');
  });

  it('check-in-received: subject truthy, html contains memberName', () => {
    const { subject, html } = checkInReceivedTemplate({
      trainerName: 'Bob',
      memberName: 'Alice',
      submittedAt: '2026-05-29',
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('Alice');
  });

  it('password-reset: subject truthy, html contains resetUrl token', () => {
    const { subject, html } = passwordResetEmailTemplate({
      resetUrl: 'https://app.example.com/reset?token=reset-token-456',
    });
    expect(subject).toBeTruthy();
    expect(html).toContain('reset-token-456');
  });
});
