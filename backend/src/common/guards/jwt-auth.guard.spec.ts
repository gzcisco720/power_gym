import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  describe('canActivate', () => {
    let superSpy: jest.SpyInstance;

    beforeEach(() => {
      superSpy = jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockReturnValue(true);
    });

    afterEach(() => {
      superSpy.mockRestore();
    });

    it('returns true (bypasses passport) when the route is marked @Public', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(true),
      } as unknown as Reflector;
      const guard = new JwtAuthGuard(reflector);
      expect(guard.canActivate(makeContext())).toBe(true);
    });

    it('delegates to super.canActivate when route is not public', () => {
      const getAllAndOverride = jest.fn().mockReturnValue(false);
      const reflector = {
        getAllAndOverride,
      } as unknown as Reflector;

      const guard = new JwtAuthGuard(reflector);
      const result = guard.canActivate(makeContext());

      expect(getAllAndOverride).toHaveBeenCalled();
      expect(superSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});
