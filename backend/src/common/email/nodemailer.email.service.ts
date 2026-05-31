import { Injectable, Inject } from '@nestjs/common';
import type { Transporter } from 'nodemailer';
import { IEmailService } from './email.service';

export const NODEMAILER_TRANSPORTER = 'NODEMAILER_TRANSPORTER';

@Injectable()
export class NodemailerEmailService implements IEmailService {
  constructor(
    @Inject(NODEMAILER_TRANSPORTER) private readonly transporter: Transporter,
  ) {}

  async sendPasswordReset(to: string, token: string): Promise<void> {
    await this.transporter.sendMail({
      to,
      subject: 'Reset your Power Gym password',
      text: `Reset your password by opening this link:\n\npowergym://reset-password?token=${token}\n\nThis link expires in 1 hour. If you did not request a password reset, ignore this email.`,
    });
  }
}
