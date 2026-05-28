import { esc } from './html-escape';

export function memberAssignedTemplate(params: {
  trainerName: string;
  memberNames: string[];
  assignerName: string;
}): { subject: string; html: string } {
  const { memberNames, assignerName } = params;
  const body =
    memberNames.length === 1
      ? `<strong>${esc(memberNames[0])}</strong> has been assigned to you by <strong>${esc(assignerName)}</strong>.`
      : `The following <strong>${esc(memberNames.length)}</strong> members have been transferred to you by <strong>${esc(assignerName)}</strong>:<ul>${memberNames.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
  return {
    subject: `New Member(s) Assigned to You — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>New Member Assignment</h2>
        <p>${body}</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
