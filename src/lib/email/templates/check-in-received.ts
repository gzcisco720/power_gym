import type { SendCheckInReceivedParams } from '@/lib/email/index';

export function checkInReceivedTemplate(params: SendCheckInReceivedParams): {
  subject: string;
  html: string;
} {
  return {
    subject: `${params.memberName} submitted a check-in — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New Check-In Submitted</h2>
        <p>Hi <strong>${params.trainerName}</strong>,</p>
        <p><strong>${params.memberName}</strong> has submitted their weekly check-in on ${params.submittedAt}.</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
