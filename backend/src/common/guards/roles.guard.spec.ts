import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function makeContext(user?: { role: string }): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  describe('canActivate', () => {
    it('returns true when no roles metadata is set', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(undefined),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      expect(guard.canActivate(makeContext({ role: 'member' }))).toBe(true);
    });

    it("returns true when the request user's role is in the required list", () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['owner', 'trainer']),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      expect(guard.canActivate(makeContext({ role: 'trainer' }))).toBe(true);
    });

    it("returns false when the user's role is not in the required list", () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['owner']),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      expect(guard.canActivate(makeContext({ role: 'member' }))).toBe(false);
    });

    it('returns false when request.user is undefined', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['owner']),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      expect(guard.canActivate(makeContext(undefined))).toBe(false);
    });
  });
});
