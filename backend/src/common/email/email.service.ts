export const EMAIL_SERVICE = 'EMAIL_SERVICE';

export interface IEmailService {
  sendPasswordReset(to: string, token: string): Promise<void>;
}
