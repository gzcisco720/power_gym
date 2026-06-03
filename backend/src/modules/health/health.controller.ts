import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { HealthService } from './health.service';
import { CreateInjuryDto } from './dto/create-injury.dto';
import { UpdateInjuryDto } from './dto/update-injury.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('health')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('member')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // ─── Injuries ───────────────────────────────────────────────────────────────

  @Get('injuries')
  findInjuries(@Request() req: RequestWithUser) {
    return this.healthService.findInjuries(req.user.sub);
  }

  @Post('injuries')
  @HttpCode(HttpStatus.CREATED)
  createInjury(@Request() req: RequestWithUser, @Body() dto: CreateInjuryDto) {
    return this.healthService.createInjury(dto, req.user.sub);
  }

  @Patch('injuries/:id')
  updateInjury(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateInjuryDto,
  ) {
    return this.healthService.updateInjury(id, dto, req.user.sub);
  }

  @Delete('injuries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteInjury(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.healthService.deleteInjury(id, req.user.sub);
  }

  // ─── Medications ─────────────────────────────────────────────────────────────

  @Get('medications')
  findMedications(@Request() req: RequestWithUser) {
    return this.healthService.findMedications(req.user.sub);
  }

  @Post('medications')
  @HttpCode(HttpStatus.CREATED)
  createMedication(
    @Request() req: RequestWithUser,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.healthService.createMedication(dto, req.user.sub);
  }

  @Patch('medications/:id')
  updateMedication(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.healthService.updateMedication(id, dto, req.user.sub);
  }

  @Delete('medications/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMedication(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.healthService.deleteMedication(id, req.user.sub);
  }

  // ─── Medical History ─────────────────────────────────────────────────────────

  @Get('medical-background')
  getMedicalHistory(@Request() req: RequestWithUser) {
    return this.healthService.getMedicalHistory(req.user.sub);
  }

  @Put('medical-background')
  saveMedicalHistory(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateMedicalHistoryDto,
  ) {
    return this.healthService.saveMedicalHistory(dto, req.user.sub);
  }
}
