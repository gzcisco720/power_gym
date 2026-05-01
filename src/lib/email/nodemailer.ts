import nodemailer from 'nodemailer';
import type {
  IEmailService,
  SendInviteParams,
  SendSessionReminderParams,
  SendPlanAssignedParams,
  SendNutritionPlanAssignedParams,
  SendMemberAssignedParams,
  SendSessionBookedParams,
  SendSessionCancelledParams,
} from '@/lib/email/index';
import { inviteEmailTemplate } from '@/lib/email/templates/invite';
import { sessionReminderTemplate } from '@/lib/email/templates/session-reminder';
import { planAssignedTemplate } from '@/lib/email/templates/plan-assigned';
import { nutritionAssignedTemplate } from '@/lib/email/templates/nutrition-assigned';
import { memberAssignedTemplate } from '@/lib/email/templates/member-assigned';
import { sessionBookedTemplate } from '@/lib/email/templates/session-booked';
import { sessionCancelledTemplate } from '@/lib/email/templates/session-cancelled';

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
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendSessionReminder(params: SendSessionReminderParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = sessionReminderTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendPlanAssigned(params: SendPlanAssignedParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = planAssignedTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendNutritionPlanAssigned(params: SendNutritionPlanAssignedParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = nutritionAssignedTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendMemberAssigned(params: SendMemberAssignedParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = memberAssignedTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendSessionBooked(params: SendSessionBookedParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = sessionBookedTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendSessionCancelled(params: SendSessionCancelledParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = sessionCancelledTemplate(params);
    await transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }
}
