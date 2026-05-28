import { esc } from './html-escape';

export function sessionBookedTemplate(params: {
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  sessionCount?: number;
}): { subject: string; html: string } {
  const { trainerName, date, startTime, endTime, isRecurring, sessionCount } =
    params;
  const body = isRecurring
    ? `<strong>${esc(sessionCount ?? 12)}</strong> sessions have been scheduled for you — weekly ${esc(startTime)}–${esc(endTime)} starting ${esc(date)} with trainer <strong>${esc(trainerName)}</strong>.`
    : `Your session has been scheduled on <strong>${esc(date)}</strong> ${esc(startTime)}–${esc(endTime)} with trainer <strong>${esc(trainerName)}</strong>.`;
  return {
    subject: `Session Booked — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Session Booking Confirmation</h2>
        <p>${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
