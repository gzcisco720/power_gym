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

describe('NodemailerEmailService — new methods', () => {
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

  it('sendPlanAssigned calls sendMail with correct to and subject', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendPlanAssigned({ to: 'member@test.com', trainerName: 'Bob', planName: 'PPL' });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@test.com', subject: expect.stringContaining('POWER GYM') }));
  });

  it('sendNutritionPlanAssigned calls sendMail with correct to and subject', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendNutritionPlanAssigned({ to: 'member@test.com', trainerName: 'Bob', planName: 'Bulk' });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@test.com', subject: expect.stringContaining('POWER GYM') }));
  });

  it('sendMemberAssigned calls sendMail with correct to and subject', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendMemberAssigned({ to: 'trainer@test.com', trainerName: 'Bob', memberNames: ['Alice'], assignerName: 'Owner' });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'trainer@test.com', subject: expect.stringContaining('POWER GYM') }));
  });

  it('sendSessionBooked calls sendMail with correct to and subject', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendSessionBooked({ to: 'member@test.com', trainerName: 'Bob', date: 'Mon May 5', startTime: '09:00', endTime: '10:00', isRecurring: false });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@test.com', subject: expect.stringContaining('POWER GYM') }));
  });

  it('sendSessionCancelled calls sendMail with correct to and subject', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();
    await service.sendSessionCancelled({ to: 'member@test.com', trainerName: 'Bob', date: 'Mon May 5', startTime: '09:00', endTime: '10:00', isSeries: false });
    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@test.com', subject: expect.stringContaining('POWER GYM') }));
  });
});
