import type { SendSessionReminderParams } from '@/lib/email/index';

export function sessionReminderTemplate(params: SendSessionReminderParams): {
  subject: string;
  html: string;
} {
  const groupNote =
    params.groupMembers.length > 0
      ? `<p>This is a group session. Other participants: <strong>${params.groupMembers.join(', ')}</strong></p>`
      : '';

  return {
    subject: `Reminder: Training session tomorrow at ${params.startTime} — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Training Session Reminder</h2>
        <p>Hi <strong>${params.memberName}</strong>,</p>
        <p>You have a training session tomorrow with <strong>${params.trainerName}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Date</td><td><strong>${params.date}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Time</td><td><strong>${params.startTime} – ${params.endTime}</strong></td></tr>
        </table>
        ${groupNote}
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
