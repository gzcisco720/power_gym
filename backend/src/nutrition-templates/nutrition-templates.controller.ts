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
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { NutritionTemplatesService } from './nutrition-templates.service';

class MealItemDto {
  @IsString()
  foodName!: string;

  @IsNumber()
  quantityG!: number;

  @IsNumber()
  kcal!: number;

  @IsNumber()
  protein!: number;

  @IsNumber()
  carbs!: number;

  @IsNumber()
  fat!: number;

  @IsOptional()
  @IsNumber()
  fiber?: number;

  @IsOptional()
  @IsNumber()
  sugar?: number;

  @IsOptional()
  @IsNumber()
  salt?: number;

  @IsOptional()
  @IsNumber()
  saturated?: number;

  @IsOptional()
  @IsNumber()
  polyunsaturated?: number;

  @IsOptional()
  @IsNumber()
  monounsaturated?: number;

  @IsOptional()
  @IsNumber()
  polyols?: number;

  @IsOptional()
  @IsNumber()
  cholesterol?: number;

  @IsOptional()
  @IsNumber()
  sodium?: number;

  @IsOptional()
  @IsNumber()
  potassium?: number;

  @IsOptional()
  @IsNumber()
  transFat?: number;
}

class MealDto {
  @IsString()
  name!: string;

  @IsNumber()
  order!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealItemDto)
  items!: MealItemDto[];
}

class DayTypeDto {
  @IsString()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealDto)
  meals!: MealDto[];
}

class CreateNutritionTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayTypeDto)
  dayTypes?: DayTypeDto[];
}

class UpdateNutritionTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayTypeDto)
  dayTypes?: DayTypeDto[];
}

@Roles('owner', 'trainer')
@Controller('nutrition-templates')
export class NutritionTemplatesController {
  constructor(private readonly service: NutritionTemplatesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateNutritionTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(dto, user.userId);
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
    @Body() dto: UpdateNutritionTemplateDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.userId);
  }
}
