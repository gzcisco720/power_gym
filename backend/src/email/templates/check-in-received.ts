import type { SendCheckInReceivedParams } from '../email.interfaces';
import { esc } from './html-escape';

export function checkInReceivedTemplate(
  params: Omit<SendCheckInReceivedParams, 'to'>,
): { subject: string; html: string } {
  return {
    subject: `${esc(params.memberName)} submitted a check-in — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New Check-In Submitted</h2>
        <p>Hi <strong>${esc(params.trainerName)}</strong>,</p>
        <p><strong>${esc(params.memberName)}</strong> has submitted their weekly check-in on ${esc(params.submittedAt)}.</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
