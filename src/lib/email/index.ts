export interface SendInviteParams {
  to: string;
  inviterName: string;
  role: 'trainer' | 'member';
  inviteUrl: string;
}

export interface IEmailService {
  sendInvite(params: SendInviteParams): Promise<void>;
}

export function getEmailService(): IEmailService {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NodemailerEmailService } = require('@/lib/email/nodemailer') as {
    NodemailerEmailService: new () => IEmailService;
  };
  return new NodemailerEmailService();
}
