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
  date: string; // e.g. "Monday, May 5, 2026"
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "10:00"
  groupMembers: string[]; // other member names (empty for 1-on-1)
}

export interface IEmailService {
  sendInvite(params: SendInviteParams): Promise<void>;
  sendSessionReminder(params: SendSessionReminderParams): Promise<void>;
}

export function getEmailService(): IEmailService {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NodemailerEmailService } = require('@/lib/email/nodemailer') as {
    NodemailerEmailService: new () => IEmailService;
  };
  return new NodemailerEmailService();
}
