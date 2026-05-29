import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreateConditionReportDto } from './dto/create-condition-report.dto';

@Controller('owner/equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Roles('owner', 'trainer')
  @Get()
  findAll() {
    return this.equipmentService.findAll();
  }

  @Roles('owner')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEquipmentDto) {
    return this.equipmentService.create(dto);
  }

  @Roles('owner')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteEquipment(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    await this.equipmentService.deleteEquipment(id.toString());
    return { success: true };
  }

  @Roles('owner', 'trainer')
  @Get(':id/condition-reports')
  listConditionReports(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.equipmentService.listConditionReports(id.toString());
  }

  @Roles('owner', 'trainer')
  @Post(':id/condition-reports')
  @HttpCode(HttpStatus.CREATED)
  addConditionReport(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: CreateConditionReportDto,
  ) {
    return this.equipmentService.addConditionReport(id.toString(), dto);
  }
}
