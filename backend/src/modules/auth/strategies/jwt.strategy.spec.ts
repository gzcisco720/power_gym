import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(configService);
  });

  describe('validate', () => {
    it('returns { sub, firstName, lastName, role, trainerId } from a decoded access-token payload', () => {
      const payload = {
        sub: 'user-id-123',
        firstName: 'Test',
        lastName: 'User',
        role: 'member' as const,
        trainerId: 'trainer-id-456',
        iat: 1000,
        exp: 2000,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        sub: 'user-id-123',
        firstName: 'Test',
        lastName: 'User',
        role: 'member',
        trainerId: 'trainer-id-456',
      });
    });
  });
});
