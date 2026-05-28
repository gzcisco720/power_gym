import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CheckInsService } from './check-ins.service';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { UpdateCheckInConfigDto } from './dto/update-check-in-config.dto';

@Controller()
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Roles('member')
  @Post('check-ins')
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCheckInDto) {
    return this.checkInsService.create(user, dto);
  }

  @Roles('member')
  @Get('check-ins')
  listMyCheckIns(@CurrentUser() user: AuthUser) {
    return this.checkInsService.listMyCheckIns(user);
  }

  @Roles('owner', 'trainer')
  @Put('check-in-config')
  @HttpCode(HttpStatus.OK)
  upsertConfig(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCheckInConfigDto,
  ) {
    return this.checkInsService.upsertConfig(user, dto);
  }
}
