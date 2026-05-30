import nodemailer from 'nodemailer';

jest.mock('nodemailer');
const mockNodemailer = jest.mocked(nodemailer);

describe('NodemailerEmailService — check-in methods', () => {
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

  it('sendCheckInReminder sends to the member with a subject mentioning check-in', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendCheckInReminder({
      to: 'member@test.com',
      memberName: 'Alice',
      trainerName: 'Bob',
      checkInUrl: 'http://localhost/member/check-in',
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'member@test.com',
        subject: expect.stringMatching(/check.?in/i),
      }),
    );
  });

  it('sendCheckInReceived sends to the trainer with member name in body', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendCheckInReceived({
      to: 'trainer@test.com',
      trainerName: 'Bob',
      memberName: 'Alice',
      submittedAt: 'Thursday, 1 May 2026 at 09:00',
    });
    const call = sendMailMock.mock.calls[0][0] as { to: string; subject: string; html: string };
    expect(call.to).toBe('trainer@test.com');
    expect(call.html).toContain('Alice');
  });
});
