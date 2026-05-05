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
  SendCheckInReminderParams,
  SendCheckInReceivedParams,
} from '@/lib/email/index';
import { inviteEmailTemplate } from '@/lib/email/templates/invite';
import { sessionReminderTemplate } from '@/lib/email/templates/session-reminder';
import { planAssignedTemplate } from '@/lib/email/templates/plan-assigned';
import { nutritionAssignedTemplate } from '@/lib/email/templates/nutrition-assigned';
import { memberAssignedTemplate } from '@/lib/email/templates/member-assigned';
import { sessionBookedTemplate } from '@/lib/email/templates/session-booked';
import { sessionCancelledTemplate } from '@/lib/email/templates/session-cancelled';
import { checkInReminderTemplate } from '@/lib/email/templates/check-in-reminder';
import { checkInReceivedTemplate } from '@/lib/email/templates/check-in-received';

export class NodemailerEmailService implements IEmailService {
  private readonly transporter = process.env.EMAIL_PROVIDER === 'mailtrap'
    ? nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: Number(process.env.MAILTRAP_PORT ?? 2525),
        auth: { user: process.env.MAILTRAP_USER, pass: process.env.MAILTRAP_PASS },
      })
    : nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

  async sendInvite(params: SendInviteParams): Promise<void> {
    const { subject, html } = inviteEmailTemplate({
      inviterName: params.inviterName,
      role: params.role,
      inviteUrl: params.inviteUrl,
    });
    await this.transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendSessionReminder(params: SendSessionReminderParams): Promise<void> {
    const { subject, html } = sessionReminderTemplate(params);
    await this.transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendPlanAssigned(params: SendPlanAssignedParams): Promise<void> {

    const { subject, html } = planAssignedTemplate(params);
    await this.transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendNutritionPlanAssigned(params: SendNutritionPlanAssignedParams): Promise<void> {

    const { subject, html } = nutritionAssignedTemplate(params);
    await this.transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendMemberAssigned(params: SendMemberAssignedParams): Promise<void> {

    const { subject, html } = memberAssignedTemplate(params);
    await this.transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendSessionBooked(params: SendSessionBookedParams): Promise<void> {

    const { subject, html } = sessionBookedTemplate(params);
    await this.transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendSessionCancelled(params: SendSessionCancelledParams): Promise<void> {

    const { subject, html } = sessionCancelledTemplate(params);
    await this.transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendCheckInReminder(params: SendCheckInReminderParams): Promise<void> {

    const { subject, html } = checkInReminderTemplate(params);
    await this.transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }

  async sendCheckInReceived(params: SendCheckInReceivedParams): Promise<void> {

    const { subject, html } = checkInReceivedTemplate(params);
    await this.transporter.sendMail({ from: process.env.SMTP_FROM, to: params.to, subject, html });
  }
}
