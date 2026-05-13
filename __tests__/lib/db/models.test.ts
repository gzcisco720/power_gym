/**
 * @jest-environment node
 */

describe('UserModel schema', () => {
  it('requires email and role fields', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({});
    const err = user.validateSync();
    expect(err?.errors['email']).toBeDefined();
    expect(err?.errors['role']).toBeDefined();
  });

  it('requires firstName and lastName', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({ email: 'a@b.com', passwordHash: 'x', role: 'member' });
    const err = user.validateSync();
    expect(err?.errors['firstName']).toBeDefined();
    expect(err?.errors['lastName']).toBeDefined();
  });

  it('rejects invalid role', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      passwordHash: 'hash',
      role: 'superadmin',
    });
    const err = user.validateSync();
    expect(err?.errors['role']).toBeDefined();
  });

  it('virtual name returns firstName + lastName', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      passwordHash: 'hash',
      role: 'member',
    });
    expect((user as unknown as { name: string }).name).toBe('John Doe');
  });
});

describe('InviteTokenModel schema', () => {
  it('requires token, role, invitedBy, recipientEmail, expiresAt', async () => {
    const { InviteTokenModel } = await import('@/lib/db/models/invite-token.model');
    const invite = new InviteTokenModel({});
    const err = invite.validateSync();
    expect(err?.errors['token']).toBeDefined();
    expect(err?.errors['role']).toBeDefined();
    expect(err?.errors['invitedBy']).toBeDefined();
    expect(err?.errors['recipientEmail']).toBeDefined();
    expect(err?.errors['expiresAt']).toBeDefined();
  });
});
