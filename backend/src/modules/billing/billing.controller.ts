import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { BillingService } from './billing.service';
import { BillingQueryDto } from './dto/billing-query.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('summary')
  @Roles('owner', 'trainer')
  getSummary(@Request() req: RequestWithUser, @Query() query: BillingQueryDto) {
    return this.billingService.getSummary(
      req.user.role,
      req.user.sub,
      query.from,
      query.to,
    );
  }

  @Get('my')
  @Roles('member')
  getMy(@Request() req: RequestWithUser, @Query() query: BillingQueryDto) {
    return this.billingService.getMyBilling(req.user.sub, query.from, query.to);
  }

  @Get('members/:memberId')
  @Roles('owner', 'trainer')
  getMemberBilling(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Query() query: BillingQueryDto,
  ) {
    return this.billingService.getMemberBilling(
      memberId,
      req.user.sub,
      req.user.role,
      query.from,
      query.to,
    );
  }
}
