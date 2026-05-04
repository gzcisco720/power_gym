export function sessionBookedTemplate(params: {
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  sessionCount?: number;
}): { subject: string; html: string } {
  const { trainerName, date, startTime, endTime, isRecurring, sessionCount } = params;
  const body = isRecurring
    ? `<strong>${sessionCount ?? 12}</strong> sessions have been scheduled for you — weekly ${startTime}–${endTime} starting ${date} with trainer <strong>${trainerName}</strong>.`
    : `Your session has been scheduled on <strong>${date}</strong> ${startTime}–${endTime} with trainer <strong>${trainerName}</strong>.`;

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
