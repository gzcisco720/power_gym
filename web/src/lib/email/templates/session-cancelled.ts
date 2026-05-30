export function sessionCancelledTemplate(params: {
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isSeries: boolean;
}): { subject: string; html: string } {
  const { date, startTime, endTime, isSeries } = params;
  const body = isSeries
    ? `All sessions in the recurring series (weekly ${startTime}–${endTime}) starting <strong>${date}</strong> have been cancelled.`
    : `Your session on <strong>${date}</strong> ${startTime}–${endTime} has been cancelled.`;

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
