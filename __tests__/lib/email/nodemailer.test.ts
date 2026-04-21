import nodemailer from 'nodemailer';

jest.mock('nodemailer');
const mockNodemailer = jest.mocked(nodemailer);

describe('NodemailerEmailService', () => {
  const sendMailMock = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.clearAllMocks();
    mockNodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock } as never);
    process.env.EMAIL_PROVIDER = 'mailtrap';
    process.env.MAILTRAP_HOST = 'sandbox.smtp.mailtrap.io';
    process.env.MAILTRAP_PORT = '2525';
    process.env.MAILTRAP_USER = 'user';
    process.env.MAILTRAP_PASS = 'pass';
    process.env.SMTP_FROM = 'noreply@test.com';
  });

  it('calls sendMail with correct to address', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();

    await service.sendInvite({
      to: 'invited@test.com',
      inviterName: 'Coach Bob',
      role: 'member',
      inviteUrl: 'http://localhost:3000/register?token=abc',
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'invited@test.com' }),
    );
  });

  it('includes role in email subject', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();

    await service.sendInvite({
      to: 'invited@test.com',
      inviterName: 'Coach Bob',
      role: 'trainer',
      inviteUrl: 'http://localhost:3000/register?token=abc',
    });

    const callArgs = sendMailMock.mock.calls[0][0] as { subject: string };
    expect(callArgs.subject.toLowerCase()).toContain('trainer');
  });
});
