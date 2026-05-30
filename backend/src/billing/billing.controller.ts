import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

interface JwtPayload {
  sub: string;
  role: string;
}

function getMonthRange(monthParam: string | null): { from: Date; to: Date } {
  const now = new Date();
  if (monthParam) {
    const [year, month] = monthParam.split('-').map(Number);
    if (year && month) {
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0, 23, 59, 59, 999);
      return { from, to };
    }
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { from, to };
}

@Controller('billing')
@Roles('owner', 'trainer')
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  @Get()
  async getBilling(
    @CurrentUser() user: JwtPayload,
    @Query('from') fromParam: string,
    @Query('to') toParam: string,
    @Query('month') monthParam: string,
  ) {
    let from: Date, to: Date;
    if (fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
    } else {
      ({ from, to } = getMonthRange(monthParam ?? null));
    }

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date parameters');
    }

    const trainerIdFilter = user.role === 'trainer' ? user.sub : undefined;
    return this.svc.getBilling(from, to, new Date(), trainerIdFilter);
  }
}
