import { RefreshTokenSchema } from './refresh-token.model';

describe('RefreshTokenSchema', () => {
  describe('schema', () => {
    it('defines userId, tokenHash, expiresAt, createdAt fields with a TTL index on expiresAt', () => {
      const paths = RefreshTokenSchema.paths;

      expect(paths['userId']).toBeDefined();
      expect(paths['tokenHash']).toBeDefined();
      expect(paths['expiresAt']).toBeDefined();
      expect(paths['createdAt']).toBeDefined();

      const indexes = RefreshTokenSchema.indexes();
      const ttlIndex = indexes.find(
        ([fields, options]) =>
          fields['expiresAt'] === 1 &&
          (options as Record<string, unknown>)['expireAfterSeconds'] === 0,
      );
      expect(ttlIndex).toBeDefined();
    });
  });
});
