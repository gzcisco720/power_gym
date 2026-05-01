export interface SendInviteParams {
  to: string;
  inviterName: string;
  role: 'trainer' | 'member';
  inviteUrl: string;
}

export interface SendSessionReminderParams {
  to: string;
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  groupMembers: string[];
}

export interface SendPlanAssignedParams {
  to: string;
  trainerName: string;
  planName: string;
}

export interface SendNutritionPlanAssignedParams {
  to: string;
  trainerName: string;
  planName: string;
}

export interface SendMemberAssignedParams {
  to: string;
  trainerName: string;
  memberNames: string[];
  assignerName: string;
}

export interface SendSessionBookedParams {
  to: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  sessionCount?: number;
}

export interface SendSessionCancelledParams {
  to: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isSeries: boolean;
}

export interface IEmailService {
  sendInvite(params: SendInviteParams): Promise<void>;
  sendSessionReminder(params: SendSessionReminderParams): Promise<void>;
  sendPlanAssigned(params: SendPlanAssignedParams): Promise<void>;
  sendNutritionPlanAssigned(params: SendNutritionPlanAssignedParams): Promise<void>;
  sendMemberAssigned(params: SendMemberAssignedParams): Promise<void>;
  sendSessionBooked(params: SendSessionBookedParams): Promise<void>;
  sendSessionCancelled(params: SendSessionCancelledParams): Promise<void>;
}

export function getEmailService(): IEmailService {
  const provider = process.env.EMAIL_PROVIDER;
  if (provider === 'mailgun') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MailgunEmailService } = require('@/lib/email/mailgun') as {
      MailgunEmailService: new () => IEmailService;
    };
    return new MailgunEmailService();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NodemailerEmailService } = require('@/lib/email/nodemailer') as {
    NodemailerEmailService: new () => IEmailService;
  };
  return new NodemailerEmailService();
}
