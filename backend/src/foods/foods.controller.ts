import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { FoodsService } from './foods.service';

class FoodMacrosDto {
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

class FoodServingDto {
  @IsString()
  label!: string;

  @IsNumber()
  grams!: number;
}

class CreateFoodDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @ValidateNested()
  @Type(() => FoodMacrosDto)
  macrosPer100g!: FoodMacrosDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FoodServingDto)
  servings!: FoodServingDto[];
}

class UpdateFoodDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => FoodMacrosDto)
  macrosPer100g?: FoodMacrosDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FoodServingDto)
  servings?: FoodServingDto[];
}

@Roles('owner', 'trainer')
@Controller('foods')
export class FoodsController {
  constructor(private readonly service: FoodsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.service.list(user.userId, q);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFoodDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.userId);
  }

  @Get(':foodId')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('foodId') foodId: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(foodId, user.userId);
  }

  @Put(':foodId')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('foodId') foodId: string,
    @Body() dto: UpdateFoodDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(foodId, dto, user.userId);
  }

  @Delete(':foodId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('foodId') foodId: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(foodId, user.userId);
  }
}
