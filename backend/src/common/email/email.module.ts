import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EMAIL_SERVICE } from './email.service';
import {
  NodemailerEmailService,
  NODEMAILER_TRANSPORTER,
} from './nodemailer.email.service';
import { MailgunEmailService } from './mailgun.email.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NODEMAILER_TRANSPORTER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        nodemailer.createTransport({
          host: config.get<string>('SMTP_HOST') ?? 'localhost',
          port: config.get<number>('SMTP_PORT') ?? 1025,
          secure: false,
          auth: config.get<string>('SMTP_USER')
            ? {
                user: config.get<string>('SMTP_USER'),
                pass: config.get<string>('SMTP_PASS'),
              }
            : undefined,
        }),
    },
    NodemailerEmailService,
    MailgunEmailService,
    {
      provide: EMAIL_SERVICE,
      inject: [ConfigService, NodemailerEmailService, MailgunEmailService],
      useFactory: (
        config: ConfigService,
        nodemailerService: NodemailerEmailService,
        mailgunService: MailgunEmailService,
      ) => {
        const provider = config.get<string>('EMAIL_PROVIDER');
        return provider === 'mailgun' ? mailgunService : nodemailerService;
      },
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
