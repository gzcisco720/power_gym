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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateConditionReportDto } from './dto/create-condition-report.dto';

@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  findAll() {
    return this.equipmentService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEquipmentDto) {
    return this.equipmentService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipmentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.equipmentService.remove(id);
  }

  @Get(':id/condition-reports')
  findConditionReports(@Param('id') id: string) {
    return this.equipmentService.findConditionReports(id);
  }

  @Post(':id/condition-reports')
  @HttpCode(HttpStatus.CREATED)
  createConditionReport(
    @Param('id') id: string,
    @Body() dto: CreateConditionReportDto,
  ) {
    return this.equipmentService.createConditionReport(id, dto.note);
  }
}
