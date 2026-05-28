import { esc } from './html-escape';

export function sessionCancelledTemplate(params: {
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isSeries: boolean;
}): { subject: string; html: string } {
  const { date, startTime, endTime, isSeries } = params;
  const body = isSeries
    ? `All sessions in the recurring series (weekly ${esc(startTime)}–${esc(endTime)}) starting <strong>${esc(date)}</strong> have been cancelled.`
    : `Your session on <strong>${esc(date)}</strong> ${esc(startTime)}–${esc(endTime)} has been cancelled.`;
  return {
    subject: `Session Cancelled — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Session Cancellation Notice</h2>
        <p>${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
