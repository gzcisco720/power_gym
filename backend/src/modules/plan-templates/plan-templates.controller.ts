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
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { PlanTemplatesService } from './plan-templates.service';
import { CreatePlanTemplateDto } from './dto/create-plan-template.dto';
import { UpdatePlanTemplateDto } from './dto/update-plan-template.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('plan-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'trainer')
export class PlanTemplatesController {
  constructor(private readonly planTemplatesService: PlanTemplatesService) {}

  @Get()
  findOwn(@Request() req: RequestWithUser) {
    return this.planTemplatesService.findOwn(req.user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: RequestWithUser, @Body() dto: CreatePlanTemplateDto) {
    return this.planTemplatesService.create(dto, req.user.sub);
  }

  @Patch(':id')
  update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlanTemplateDto,
  ) {
    return this.planTemplatesService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.planTemplatesService.remove(id, req.user.sub);
  }
}
