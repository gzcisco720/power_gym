import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { SelfTrainingService } from './self-training.service';
import type { ISelfWorkoutSet } from '../database/models/self-workout-log.model';

interface CreateLogBody {
  dayName?: string;
  sourceTemplateId?: string | null;
  sourceTemplateDayNumber?: number | null;
  plannedSets?: ISelfWorkoutSet[];
}

interface CompleteBody {
  rpe?: number | null;
  note?: string | null;
}

interface UpdateSetBody {
  actualWeight: number | null;
  actualReps: number | null;
}

@Roles('owner', 'trainer', 'member')
@Controller('me/workout-logs')
export class SelfTrainingController {
  constructor(private readonly service: SelfTrainingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthUser,
    @Query('deleteActive') deleteActiveParam: string,
    @Body() body: CreateLogBody,
  ) {
    this.service.validateDayName(body.dayName);
    const deleteActive = deleteActiveParam === 'true';
    return this.service.create(
      user.userId,
      {
        dayName: body.dayName,
        sourceTemplateId: body.sourceTemplateId ?? null,
        sourceTemplateDayNumber: body.sourceTemplateDayNumber ?? null,
        sets: body.plannedSets ?? [],
      },
      deleteActive,
    );
  }

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('year') yearParam: string,
    @Query('month') monthParam: string,
  ) {
    if (!yearParam || !monthParam) {
      throw new BadRequestException('year and month required');
    }
    return this.service.list(
      user.userId,
      parseInt(yearParam, 10),
      parseInt(monthParam, 10),
    );
  }

  @Get('active')
  async getActive(@CurrentUser() user: AuthUser) {
    return this.service.getActive(user.userId);
  }

  @Get('range')
  async getRange(
    @CurrentUser() user: AuthUser,
    @Query('start') startParam: string,
    @Query('end') endParam: string,
  ) {
    if (!startParam || !endParam) {
      throw new BadRequestException('start and end required');
    }
    const start = new Date(startParam);
    const end = new Date(endParam);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('invalid date');
    }
    return this.service.getRange(user.userId, start, end);
  }

  @Get(':id')
  async getById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(id, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.service.delete(id, user.userId);
  }

  @Post(':id/sets')
  async addSet(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ISelfWorkoutSet,
  ) {
    const log = await this.service.addSet(id, user.userId, body);
    if (!log) throw new NotFoundException('Not found');
    return log;
  }

  @Patch(':id/sets/:setIndex')
  async updateSet(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('setIndex') setIndexParam: string,
    @Body() body: UpdateSetBody,
  ) {
    const setIndex = parseInt(setIndexParam, 10);
    return this.service.updateSet(id, user.userId, setIndex, {
      actualWeight: body.actualWeight,
      actualReps: body.actualReps,
    });
  }

  @Post(':id/complete')
  async complete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: CompleteBody,
  ) {
    const log = await this.service.complete(
      id,
      user.userId,
      body.rpe ?? null,
      body.note ?? null,
    );
    if (!log) throw new NotFoundException('Not found');
    return log;
  }

  @Post(':id/seal')
  async seal(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const log = await this.service.seal(id, user.userId);
    if (!log) throw new NotFoundException('Not found');
    return log;
  }
}
