import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { MemberHealthService } from './member-health.service';
import { CreateInjuryDto } from './dto/create-injury.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';

@Controller('members/:memberId')
export class MemberHealthController {
  constructor(private readonly memberHealthService: MemberHealthService) {}

  // ── Injuries ──────────────────────────────────────────────

  @Roles('owner', 'trainer')
  @Post('injuries')
  @HttpCode(HttpStatus.CREATED)
  createInjury(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Body() dto: CreateInjuryDto,
  ) {
    return this.memberHealthService.createInjury(
      user,
      memberId.toString(),
      dto,
    );
  }

  @Roles('owner', 'trainer', 'member')
  @Get('injuries')
  listInjuries(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.memberHealthService.listInjuries(user, memberId.toString());
  }

  // ── Medical History ───────────────────────────────────────

  @Roles('owner', 'trainer', 'member')
  @Get('medical-history')
  getMedicalHistory(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.memberHealthService.getMedicalHistory(
      user,
      memberId.toString(),
    );
  }

  @Roles('owner', 'trainer')
  @Put('medical-history')
  @HttpCode(HttpStatus.OK)
  upsertMedicalHistory(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Body() dto: UpdateMedicalHistoryDto,
  ) {
    return this.memberHealthService.upsertMedicalHistory(
      user,
      memberId.toString(),
      dto,
    );
  }

  // ── Medications ───────────────────────────────────────────

  @Roles('owner', 'trainer')
  @Post('medications')
  @HttpCode(HttpStatus.CREATED)
  createMedication(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.memberHealthService.createMedication(
      user,
      memberId.toString(),
      dto,
    );
  }

  @Roles('owner', 'trainer', 'member')
  @Get('medications')
  listMedications(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.memberHealthService.listMedications(user, memberId.toString());
  }
}
