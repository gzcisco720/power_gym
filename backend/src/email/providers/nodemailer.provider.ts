import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import type { IEmailProvider } from '../email.interfaces';
import type {
  SendInviteParams,
  SendSessionReminderParams,
  SendPlanAssignedParams,
  SendNutritionPlanAssignedParams,
  SendMemberAssignedParams,
  SendSessionBookedParams,
  SendSessionCancelledParams,
  SendCheckInReminderParams,
  SendCheckInReceivedParams,
  SendPasswordResetParams,
} from '../email.interfaces';
import { inviteEmailTemplate } from '../templates/invite';
import { sessionReminderTemplate } from '../templates/session-reminder';
import { planAssignedTemplate } from '../templates/plan-assigned';
import { nutritionAssignedTemplate } from '../templates/nutrition-assigned';
import { memberAssignedTemplate } from '../templates/member-assigned';
import { sessionBookedTemplate } from '../templates/session-booked';
import { sessionCancelledTemplate } from '../templates/session-cancelled';
import { checkInReminderTemplate } from '../templates/check-in-reminder';
import { checkInReceivedTemplate } from '../templates/check-in-received';
import { passwordResetEmailTemplate } from '../templates/password-reset';

export class NodemailerProvider implements IEmailProvider {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from = config.get<string>('SMTP_FROM') ?? 'noreply@powergym.app';
    const provider = config.get<string>('EMAIL_PROVIDER');
    if (provider === 'mailtrap') {
      this.transporter = nodemailer.createTransport({
        host: config.get<string>('MAILTRAP_HOST'),
        port: Number(config.get<string>('MAILTRAP_PORT') ?? 2525),
        auth: {
          user: config.get<string>('MAILTRAP_USER'),
          pass: config.get<string>('MAILTRAP_PASS'),
        },
      });
    } else {
      const smtpUser = config.get<string>('SMTP_USER');
      this.transporter = nodemailer.createTransport({
        host: config.get<string>('SMTP_HOST'),
        port: Number(config.get<string>('SMTP_PORT') ?? 587),
        ...(smtpUser
          ? { auth: { user: smtpUser, pass: config.get<string>('SMTP_PASS') } }
          : {}),
      });
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }

  async sendInvite(params: SendInviteParams): Promise<void> {
    const { subject, html } = inviteEmailTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendSessionReminder(params: SendSessionReminderParams): Promise<void> {
    const { subject, html } = sessionReminderTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendPlanAssigned(params: SendPlanAssignedParams): Promise<void> {
    const { subject, html } = planAssignedTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendNutritionPlanAssigned(
    params: SendNutritionPlanAssignedParams,
  ): Promise<void> {
    const { subject, html } = nutritionAssignedTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendMemberAssigned(params: SendMemberAssignedParams): Promise<void> {
    const { subject, html } = memberAssignedTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendSessionBooked(params: SendSessionBookedParams): Promise<void> {
    const { subject, html } = sessionBookedTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendSessionCancelled(
    params: SendSessionCancelledParams,
  ): Promise<void> {
    const { subject, html } = sessionCancelledTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendCheckInReminder(params: SendCheckInReminderParams): Promise<void> {
    const { subject, html } = checkInReminderTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendCheckInReceived(params: SendCheckInReceivedParams): Promise<void> {
    const { subject, html } = checkInReceivedTemplate(params);
    await this.send(params.to, subject, html);
  }

  async sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    const { subject, html } = passwordResetEmailTemplate({
      resetUrl: params.resetUrl,
    });
    await this.send(params.to, subject, html);
  }
}
