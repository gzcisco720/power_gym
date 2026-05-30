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
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { EquipmentService } from './equipment.service';
import type { EquipmentStatus } from '../database/models/equipment.model';

class CreateEquipmentDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(['active', 'maintenance', 'retired'])
  status?: EquipmentStatus;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @IsBoolean()
  trackCondition?: boolean;

  @IsOptional()
  @IsDateString()
  nextServiceDate?: string | null;
}

class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['active', 'maintenance', 'retired'])
  status?: EquipmentStatus;

  @IsOptional()
  @IsString()
  brand?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @IsBoolean()
  trackCondition?: boolean;

  @IsOptional()
  @IsDateString()
  nextServiceDate?: string | null;
}

class AddConditionReportDto {
  @IsString()
  note!: string;
}

@Roles('owner')
@Controller('owner/equipment')
export class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEquipmentDto) {
    return this.service.create({
      name: dto.name,
      status: dto.status,
      brand: dto.brand,
      quantity: dto.quantity,
      images: dto.images,
      note: dto.note,
      trackCondition: dto.trackCondition,
      nextServiceDate: dto.nextServiceDate
        ? new Date(dto.nextServiceDate)
        : null,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.service.update(id, {
      name: dto.name,
      status: dto.status,
      brand: dto.brand,
      quantity: dto.quantity,
      images: dto.images,
      note: dto.note,
      trackCondition: dto.trackCondition,
      nextServiceDate: dto.nextServiceDate
        ? new Date(dto.nextServiceDate)
        : undefined,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/condition-reports')
  @HttpCode(HttpStatus.OK)
  getConditionReports(@Param('id') id: string) {
    return this.service.getConditionReports(id);
  }

  @Post(':id/condition-reports')
  @HttpCode(HttpStatus.CREATED)
  addConditionReport(
    @Param('id') id: string,
    @Body() dto: AddConditionReportDto,
  ) {
    return this.service.addConditionReport(id, dto.note);
  }
}
