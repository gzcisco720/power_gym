import nodemailer from 'nodemailer';
import type { IEmailService, SendInviteParams, SendSessionReminderParams } from '@/lib/email/index';
import { inviteEmailTemplate } from '@/lib/email/templates/invite';
import { sessionReminderTemplate } from '@/lib/email/templates/session-reminder';

function createTransport() {
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === 'mailtrap') {
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: Number(process.env.MAILTRAP_PORT ?? 2525),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export class NodemailerEmailService implements IEmailService {
  async sendInvite(params: SendInviteParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = inviteEmailTemplate({
      inviterName: params.inviterName,
      role: params.role,
      inviteUrl: params.inviteUrl,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: params.to,
      subject,
      html,
    });
  }

  async sendSessionReminder(params: SendSessionReminderParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = sessionReminderTemplate(params);
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: params.to,
      subject,
      html,
    });
  }
}
