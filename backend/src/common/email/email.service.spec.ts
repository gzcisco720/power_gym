import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email.module';
import { EMAIL_SERVICE } from './email.service';
import { NodemailerEmailService } from './nodemailer.email.service';
import { MailgunEmailService } from './mailgun.email.service';

describe('EmailService', () => {
  describe('getEmailService', () => {
    it('returns NodemailerEmailService when EMAIL_PROVIDER is unset', async () => {
      delete process.env.EMAIL_PROVIDER;

      const module: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true }), EmailModule],
      }).compile();

      const service: unknown = module.get(EMAIL_SERVICE);
      expect(service).toBeInstanceOf(NodemailerEmailService);
    });

    it('returns MailgunEmailService when EMAIL_PROVIDER is "mailgun"', async () => {
      process.env.EMAIL_PROVIDER = 'mailgun';

      const module: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true }), EmailModule],
      }).compile();

      const service: unknown = module.get(EMAIL_SERVICE);
      expect(service).toBeInstanceOf(MailgunEmailService);

      delete process.env.EMAIL_PROVIDER;
    });
  });

  describe('NodemailerEmailService', () => {
    describe('sendPasswordReset', () => {
      it('calls transporter.sendMail with the reset deep-link in the body and the recipient as "to"', async () => {
        const sendMailMock = jest
          .fn()
          .mockResolvedValue({ messageId: 'test-id' });
        const transporterMock = { sendMail: sendMailMock };

        const service = new NodemailerEmailService(transporterMock as never);

        await service.sendPasswordReset('user@example.com', 'abc123token');

        expect(sendMailMock).toHaveBeenCalledTimes(1);
        expect(sendMailMock).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'user@example.com',
            text: expect.stringContaining(
              'powergym://reset-password?token=abc123token',
            ) as string,
          }),
        );
      });
    });
  });
});
