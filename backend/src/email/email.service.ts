import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IEmailProvider } from './email.interfaces';
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
} from './email.interfaces';
import { NodemailerProvider } from './providers/nodemailer.provider';
import { MailgunProvider } from './providers/mailgun.provider';

@Injectable()
export class EmailService implements IEmailProvider {
  private readonly provider: IEmailProvider;

  constructor(private readonly config: ConfigService) {
    const emailProvider = config.get<string>('EMAIL_PROVIDER');
    if (emailProvider === 'mailgun') {
      this.provider = new MailgunProvider(config);
    } else {
      this.provider = new NodemailerProvider(config);
    }
  }

  sendInvite(params: SendInviteParams): Promise<void> {
    return this.provider.sendInvite(params);
  }

  sendSessionReminder(params: SendSessionReminderParams): Promise<void> {
    return this.provider.sendSessionReminder(params);
  }

  sendPlanAssigned(params: SendPlanAssignedParams): Promise<void> {
    return this.provider.sendPlanAssigned(params);
  }

  sendNutritionPlanAssigned(
    params: SendNutritionPlanAssignedParams,
  ): Promise<void> {
    return this.provider.sendNutritionPlanAssigned(params);
  }

  sendMemberAssigned(params: SendMemberAssignedParams): Promise<void> {
    return this.provider.sendMemberAssigned(params);
  }

  sendSessionBooked(params: SendSessionBookedParams): Promise<void> {
    return this.provider.sendSessionBooked(params);
  }

  sendSessionCancelled(params: SendSessionCancelledParams): Promise<void> {
    return this.provider.sendSessionCancelled(params);
  }

  sendCheckInReminder(params: SendCheckInReminderParams): Promise<void> {
    return this.provider.sendCheckInReminder(params);
  }

  sendCheckInReceived(params: SendCheckInReceivedParams): Promise<void> {
    return this.provider.sendCheckInReceived(params);
  }

  sendPasswordReset(params: SendPasswordResetParams): Promise<void> {
    return this.provider.sendPasswordReset(params);
  }
}
