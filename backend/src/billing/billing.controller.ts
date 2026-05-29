import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { BillingService } from './billing.service';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Roles('owner')
  @Post('service-types')
  @HttpCode(HttpStatus.CREATED)
  async createServiceType(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateServiceTypeDto,
  ) {
    const serviceType = await this.billingService.createServiceType(user, dto);
    return { serviceType };
  }

  @Roles('owner', 'trainer')
  @Get('service-types/active')
  async getActiveServiceTypes() {
    const serviceTypes = await this.billingService.findActiveServiceTypes();
    return { serviceTypes };
  }

  @Roles('owner')
  @Delete('service-types/:id')
  @HttpCode(HttpStatus.OK)
  async deleteServiceType(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    await this.billingService.deleteServiceType(id.toString());
    return { success: true };
  }

  @Roles('owner', 'trainer', 'member')
  @Get('billing/member/:id')
  async getMemberBilling(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.billingService.getMemberBilling(
      user,
      id.toString(),
      fromDate,
      toDate,
    );
  }
}
