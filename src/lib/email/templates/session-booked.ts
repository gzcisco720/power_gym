export function sessionBookedTemplate(params: {
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  sessionCount?: number;
}): { subject: string; html: string } {
  const { trainerName, date, startTime, endTime, isRecurring, sessionCount } = params;
  const body = isRecurring
    ? `已为你安排 <strong>${sessionCount ?? 12}</strong> 节课，每周 ${startTime}–${endTime}，从 ${date} 开始，教练 <strong>${trainerName}</strong>。`
    : `你的训练课已安排在 <strong>${date}</strong> ${startTime}–${endTime}，教练 <strong>${trainerName}</strong>。`;

  return {
    subject: `训练课已安排 — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>训练课预约确认</h2>
        <p>${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
