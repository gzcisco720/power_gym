/** @jest-environment node */

describe('PasswordResetTokenModel schema', () => {
  it('requires userId, tokenHash, expiresAt', async () => {
    const { PasswordResetTokenModel } = await import('@/lib/db/models/password-reset-token.model');
    const doc = new PasswordResetTokenModel({});
    const err = doc.validateSync();
    expect(err?.errors['userId']).toBeDefined();
    expect(err?.errors['tokenHash']).toBeDefined();
    expect(err?.errors['expiresAt']).toBeDefined();
  });

  it('defaults usedAt to null', async () => {
    const { PasswordResetTokenModel } = await import('@/lib/db/models/password-reset-token.model');
    const doc = new PasswordResetTokenModel({
      userId: '507f1f77bcf86cd799439011',
      tokenHash: 'abc123',
      expiresAt: new Date(Date.now() + 3600000),
    });
    expect(doc.usedAt).toBeNull();
  });

  it('accepts a valid token document', async () => {
    const { PasswordResetTokenModel } = await import('@/lib/db/models/password-reset-token.model');
    const doc = new PasswordResetTokenModel({
      userId: '507f1f77bcf86cd799439011',
      tokenHash: 'somehash',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });
});
