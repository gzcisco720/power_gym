import { esc } from './html-escape';

export function planAssignedTemplate(params: {
  trainerName: string;
  planName: string;
}): { subject: string; html: string } {
  return {
    subject: `Your Training Plan Has Been Updated — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Training Plan Updated</h2>
        <p><strong>${esc(params.trainerName)}</strong> has assigned you a new training plan: <strong>${esc(params.planName)}</strong>. Log in to view it.</p>
        <p style="color:#666;font-size:12px;margin-top:24px;">POWER GYM</p>
      </div>
    `,
  };
}
