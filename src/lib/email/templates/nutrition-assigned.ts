export function nutritionAssignedTemplate(params: {
  memberName: string;
  trainerName: string;
  planName: string;
}): { subject: string; html: string } {
  return {
    subject: `你的营养计划已更新 — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>营养计划已更新</h2>
        <p><strong>${params.trainerName}</strong> 已为你分配了新的营养计划「<strong>${params.planName}</strong>」，请登录查看。</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
