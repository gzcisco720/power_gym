import FormData from 'form-data';
import Mailgun from 'mailgun.js';
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

export class MailgunEmailService implements IEmailService {
  private mg: ReturnType<InstanceType<typeof Mailgun>['client']>;
  private domain: string;

  constructor() {
    const key = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    if (!key) throw new Error('MAILGUN_API_KEY is not set');
    if (!domain) throw new Error('MAILGUN_DOMAIN is not set');
    const mailgun = new Mailgun(FormData);
    this.mg = mailgun.client({ username: 'api', key });
    this.domain = domain;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    await this.mg.messages.create(this.domain, {
      from: process.env.SMTP_FROM,
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

  async sendNutritionPlanAssigned(params: SendNutritionPlanAssignedParams): Promise<void> {
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

  async sendSessionCancelled(params: SendSessionCancelledParams): Promise<void> {
    const { subject, html } = sessionCancelledTemplate(params);
    await this.send(params.to, subject, html);
  }
}
