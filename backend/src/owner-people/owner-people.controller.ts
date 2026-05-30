import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { OwnerPeopleService } from './owner-people.service';

class ReassignTrainerDto {
  @IsString()
  @IsOptional()
  trainerId!: string | null;
}

@Roles('owner')
@Controller('owner')
export class OwnerPeopleController {
  constructor(private readonly service: OwnerPeopleService) {}

  // ── Trainers ───────────────────────────────────────────────────────────────

  @Get('trainers')
  @HttpCode(HttpStatus.OK)
  listTrainers() {
    return this.service.listTrainers();
  }

  @Get('trainers/:id')
  @HttpCode(HttpStatus.OK)
  getTrainer(@Param('id') id: string) {
    return this.service.getTrainerById(id);
  }

  @Get('trainers/:id/members')
  @HttpCode(HttpStatus.OK)
  getTrainerMembers(@Param('id') id: string) {
    return this.service.getTrainerMembers(id);
  }

  @Get('trainers/:id/training-plans')
  @HttpCode(HttpStatus.OK)
  getTrainerPlans(@Param('id') id: string) {
    return this.service.getTrainerPlans(id);
  }

  @Get('trainers/:id/nutrition-plans')
  @HttpCode(HttpStatus.OK)
  getTrainerNutritionPlans(@Param('id') id: string) {
    return this.service.getTrainerNutritionPlans(id);
  }

  @Get('trainers/:id/calendar')
  @HttpCode(HttpStatus.OK)
  getTrainerCalendar(@Param('id') id: string) {
    return this.service.getTrainerCalendar(id);
  }

  // ── Members ────────────────────────────────────────────────────────────────

  @Get('members')
  @HttpCode(HttpStatus.OK)
  listMembers(@Query('trainerId') trainerId?: string) {
    return this.service.listMembers(trainerId);
  }

  @Patch('members/:id/trainer')
  @HttpCode(HttpStatus.OK)
  reassignTrainer(@Param('id') id: string, @Body() body: ReassignTrainerDto) {
    return this.service.reassignTrainer(id, body.trainerId ?? null);
  }
}
