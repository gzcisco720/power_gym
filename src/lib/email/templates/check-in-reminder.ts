import type { SendCheckInReminderParams } from '@/lib/email/index';

export function checkInReminderTemplate(params: SendCheckInReminderParams): {
  subject: string;
  html: string;
} {
  return {
    subject: `Time for your weekly check-in — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Weekly Check-In Reminder</h2>
        <p>Hi <strong>${params.memberName}</strong>,</p>
        <p>Your trainer <strong>${params.trainerName}</strong> has scheduled your weekly check-in. Take a few minutes to log your progress.</p>
        <p style="margin: 24px 0;">
          <a href="${params.checkInUrl}" style="background:#fff;color:#000;padding:10px 20px;text-decoration:none;font-weight:bold;border-radius:4px;border:1px solid #000;">
            Submit Check-In
          </a>
        </p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
