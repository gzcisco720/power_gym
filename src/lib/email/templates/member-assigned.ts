export function memberAssignedTemplate(params: {
  trainerName: string;
  memberNames: string[];
  assignerName: string;
}): { subject: string; html: string } {
  const { memberNames, assignerName } = params;
  const body =
    memberNames.length === 1
      ? `<strong>${memberNames[0]}</strong> 已由 <strong>${assignerName}</strong> 分配给你。`
      : `以下 <strong>${memberNames.length}</strong> 名会员已由 <strong>${assignerName}</strong> 转移给你：<ul>${memberNames.map((n) => `<li>${n}</li>`).join('')}</ul>`;

  return {
    subject: `新会员已分配给你 — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>新会员分配通知</h2>
        <p>${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
