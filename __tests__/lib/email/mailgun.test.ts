const mockCreate = jest.fn().mockResolvedValue({});
const mockClient = { messages: { create: mockCreate } };

jest.mock('mailgun.js', () => {
  return jest.fn().mockImplementation(() => ({
    client: jest.fn().mockReturnValue(mockClient),
  }));
});
jest.mock('form-data', () => jest.fn());

describe('MailgunEmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MAILGUN_API_KEY = 'test-key';
    process.env.MAILGUN_DOMAIN = 'mg.example.com';
    process.env.SMTP_FROM = 'noreply@example.com';
  });

  it('sendInvite calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendInvite({ to: 'invited@test.com', inviterName: 'Bob', role: 'member', inviteUrl: 'http://example.com' });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['invited@test.com'] }));
  });

  it('sendSessionReminder calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendSessionReminder({ to: 'member@test.com', memberName: 'Alice', trainerName: 'Bob', date: 'Mon May 5', startTime: '09:00', endTime: '10:00', groupMembers: [] });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['member@test.com'] }));
  });

  it('sendPlanAssigned calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendPlanAssigned({ to: 'member@test.com', trainerName: 'Bob', planName: 'PPL' });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['member@test.com'] }));
  });

  it('sendNutritionPlanAssigned calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendNutritionPlanAssigned({ to: 'member@test.com', trainerName: 'Bob', planName: 'Bulk Diet' });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['member@test.com'] }));
  });

  it('sendMemberAssigned calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendMemberAssigned({ to: 'trainer@test.com', trainerName: 'Bob', memberNames: ['Alice'], assignerName: 'Owner' });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['trainer@test.com'] }));
  });

  it('sendSessionBooked calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendSessionBooked({ to: 'member@test.com', trainerName: 'Bob', date: 'Mon May 5', startTime: '09:00', endTime: '10:00', isRecurring: false });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['member@test.com'] }));
  });

  it('sendSessionCancelled calls messages.create with correct to', async () => {
    const { MailgunEmailService } = await import('@/lib/email/mailgun');
    const service = new MailgunEmailService();
    await service.sendSessionCancelled({ to: 'member@test.com', trainerName: 'Bob', date: 'Mon May 5', startTime: '09:00', endTime: '10:00', isSeries: false });
    expect(mockCreate).toHaveBeenCalledWith('mg.example.com', expect.objectContaining({ to: ['member@test.com'] }));
  });
});
