import type { SendSessionReminderParams } from '../email.interfaces';
import { esc } from './html-escape';

export function sessionReminderTemplate(
  params: Omit<SendSessionReminderParams, 'to'>,
): { subject: string; html: string } {
  const groupNote =
    params.groupMembers.length > 0
      ? `<p>This is a group session. Other participants: <strong>${params.groupMembers.map(esc).join(', ')}</strong></p>`
      : '';
  return {
    subject: `Reminder: Training session tomorrow at ${esc(params.startTime)} — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Training Session Reminder</h2>
        <p>Hi <strong>${esc(params.memberName)}</strong>,</p>
        <p>You have a training session tomorrow with <strong>${esc(params.trainerName)}</strong>.</p>
        <table style="border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Date</td><td><strong>${esc(params.date)}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Time</td><td><strong>${esc(params.startTime)} – ${esc(params.endTime)}</strong></td></tr>
        </table>
        ${groupNote}
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
