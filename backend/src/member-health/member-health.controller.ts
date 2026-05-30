import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { MemberHealthService } from './member-health.service';
import type {
  CreateInjuryData,
  UpdateInjuryData,
} from '../repositories/member-injury.repository';
import type { UpsertMedicalHistoryData } from '../repositories/member-medical-history.repository';
import type {
  CreateMedicationData,
  UpdateMedicationData,
} from '../repositories/member-medication.repository';

@Roles('owner', 'trainer', 'member')
@Controller('members/:memberId')
export class MemberHealthController {
  constructor(private readonly svc: MemberHealthService) {}

  // --- Injuries ---

  @Get('injuries')
  listInjuries(
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.listInjuries(memberId, user.userId, user.role);
  }

  @Post('injuries')
  @HttpCode(201)
  addInjury(
    @Param('memberId') memberId: string,
    @Body() body: Omit<CreateInjuryData, 'memberId'>,
    @CurrentUser() user: AuthUser,
  ) {
    if (!body.title?.trim()) {
      throw new BadRequestException('title is required');
    }
    return this.svc.addInjury(memberId, body, user.userId, user.role);
  }

  @Patch('injuries/:injuryId')
  updateInjury(
    @Param('memberId') memberId: string,
    @Param('injuryId') injuryId: string,
    @Body() body: UpdateInjuryData,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.updateInjury(
      memberId,
      injuryId,
      body,
      user.userId,
      user.role,
    );
  }

  @Delete('injuries/:injuryId')
  @HttpCode(204)
  deleteInjury(
    @Param('memberId') memberId: string,
    @Param('injuryId') injuryId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.deleteInjury(memberId, injuryId, user.userId, user.role);
  }

  // --- Medical History ---

  @Get('medical-history')
  getMedicalHistory(
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.getMedicalHistory(memberId, user.userId, user.role);
  }

  @Put('medical-history')
  updateMedicalHistory(
    @Param('memberId') memberId: string,
    @Body() body: UpsertMedicalHistoryData,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.updateMedicalHistory(
      memberId,
      body,
      user.userId,
      user.role,
    );
  }

  // --- Medications ---

  @Get('medications')
  listMedications(
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.listMedications(memberId, user.userId, user.role);
  }

  @Post('medications')
  @HttpCode(201)
  addMedication(
    @Param('memberId') memberId: string,
    @Body() body: Omit<CreateMedicationData, 'memberId'>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.addMedication(memberId, body, user.userId, user.role);
  }

  @Patch('medications/:medicationId')
  updateMedication(
    @Param('memberId') memberId: string,
    @Param('medicationId') medicationId: string,
    @Body() body: UpdateMedicationData,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.updateMedication(
      memberId,
      medicationId,
      body,
      user.userId,
      user.role,
    );
  }

  @Delete('medications/:medicationId')
  @HttpCode(204)
  deleteMedication(
    @Param('memberId') memberId: string,
    @Param('medicationId') medicationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.svc.deleteMedication(
      memberId,
      medicationId,
      user.userId,
      user.role,
    );
  }
}
