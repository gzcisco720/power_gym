import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ConditionalThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.THROTTLE_DISABLED === 'true') {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }
}
