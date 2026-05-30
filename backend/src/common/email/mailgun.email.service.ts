import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailgun from 'mailgun.js';
import FormData from 'form-data';
import { IEmailService } from './email.service';

@Injectable()
export class MailgunEmailService implements IEmailService {
  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const mailgun = new Mailgun(FormData);
    const client = mailgun.client({
      username: 'api',
      key: this.config.get<string>('MAILGUN_API_KEY') ?? '',
    });
    const domain = this.config.get<string>('MAILGUN_DOMAIN') ?? '';
    const from =
      this.config.get<string>('EMAIL_FROM') ?? 'noreply@powergym.com';

    await client.messages.create(domain, {
      from,
      to,
      subject: 'Reset your Power Gym password',
      text: `Reset your password by opening this link:\n\npowergym://reset-password?token=${token}\n\nThis link expires in 1 hour. If you did not request a password reset, ignore this email.`,
    });
  }
}
