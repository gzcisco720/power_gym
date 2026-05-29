import { AuthGuard } from '@nestjs/passport';
import { RefreshTokenGuard } from './refresh-token.guard';

describe('RefreshTokenGuard', () => {
  it("is an AuthGuard configured for the 'jwt-refresh' strategy", () => {
    const guard = new RefreshTokenGuard();
    expect(guard).toBeInstanceOf(AuthGuard('jwt-refresh'));
  });
});
