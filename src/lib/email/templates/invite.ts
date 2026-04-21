export function inviteEmailTemplate(params: {
  inviterName: string;
  role: 'trainer' | 'member';
  inviteUrl: string;
}): { subject: string; html: string } {
  const roleLabel = params.role === 'trainer' ? 'Trainer' : 'Member';

  return {
    subject: `You've been invited as a ${roleLabel} — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>You've been invited to POWER GYM</h2>
        <p><strong>${params.inviterName}</strong> has invited you to join as a <strong>${roleLabel}</strong>.</p>
        <p>Click the link below to create your account. This link expires in 48 hours.</p>
        <a
          href="${params.inviteUrl}"
          style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;"
        >
          Accept Invitation
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">
          If you weren't expecting this, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}
