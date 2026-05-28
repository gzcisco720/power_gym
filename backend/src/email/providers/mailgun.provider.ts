import FormData from 'form-data';
import Mailgun from 'mailgun.js';
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

export class MailgunProvider implements IEmailProvider {
  private readonly mg: ReturnType<InstanceType<typeof Mailgun>['client']>;
  private readonly domain: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    const key = config.getOrThrow<string>('MAILGUN_API_KEY');
    this.domain = config.getOrThrow<string>('MAILGUN_DOMAIN');
    this.from = config.get<string>('SMTP_FROM') ?? 'noreply@powergym.app';
    const mailgun = new Mailgun(FormData);
    this.mg = mailgun.client({ username: 'api', key });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    await this.mg.messages.create(this.domain, {
      from: this.from,
      to: [to],
      subject,
      html,
    });
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
