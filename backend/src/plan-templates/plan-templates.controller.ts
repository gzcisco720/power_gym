import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { PlanTemplatesService } from './plan-templates.service';
import type {
  CreatePlanTemplateDto as ICreatePlanTemplateDto,
  UpdatePlanTemplateDto as IUpdatePlanTemplateDto,
} from './plan-templates.service';

class PlanDayExerciseDto {
  @IsString()
  groupId!: string;

  @IsBoolean()
  isSuperset!: boolean;

  @IsString()
  exerciseId!: string;

  @IsString()
  exerciseName!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsBoolean()
  isBodyweight!: boolean;

  @IsNumber()
  sets!: number;

  @IsNumber()
  repsMin!: number;

  @IsNumber()
  repsMax!: number;

  @IsOptional()
  @IsNumber()
  restSeconds?: number | null;
}

class PlanDayDto {
  @IsNumber()
  dayNumber!: number;

  @IsString()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDayExerciseDto)
  exercises!: PlanDayExerciseDto[];
}

class CreatePlanTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDayDto)
  days?: PlanDayDto[];
}

class UpdatePlanTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanDayDto)
  days?: PlanDayDto[];
}

@Roles('owner', 'trainer')
@Controller('plan-templates')
export class PlanTemplatesController {
  constructor(private readonly service: PlanTemplatesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePlanTemplateDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto as ICreatePlanTemplateDto, user.userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.userId);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlanTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto as IUpdatePlanTemplateDto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.userId);
  }
}
