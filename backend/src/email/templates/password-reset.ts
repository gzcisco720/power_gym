export function passwordResetEmailTemplate(params: { resetUrl: string }): {
  subject: string;
  html: string;
} {
  const safeUrl = params.resetUrl.startsWith('https://')
    ? params.resetUrl
    : '#';
  return {
    subject: 'Reset your POWER GYM password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your POWER GYM password. Click the button below to set a new password. This link expires in 1 hour.</p>
        <a
          href="${safeUrl}"
          style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;"
        >
          Reset Password
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">
          If you didn't request this, you can safely ignore this email. Your password won't be changed.
        </p>
      </div>
    `,
  };
}
