export function sessionCancelledTemplate(params: {
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isSeries: boolean;
}): { subject: string; html: string } {
  const { date, startTime, endTime, isSeries } = params;
  const body = isSeries
    ? `从 <strong>${date}</strong> 起的系列训练课（每周 ${startTime}–${endTime}）已全部取消。`
    : `原定 <strong>${date}</strong> ${startTime}–${endTime} 的训练课已取消。`;

  return {
    subject: `训练课已取消 — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>训练课取消通知</h2>
        <p>${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
