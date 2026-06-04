import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { NutritionService } from './nutrition.service';
import { AssignNutritionPlanDto } from './dto/assign-nutrition-plan.dto';
import { LogFoodDto } from './dto/log-food.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('nutrition')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('my-plan')
  @Roles('member')
  async getMyPlan(
    @Request() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const plan = await this.nutritionService.getMyPlan(req.user.sub);
    if (plan === null) {
      res.setHeader('Content-Type', 'application/json');
      res.send('null');
      return;
    }
    return plan;
  }

  @Get('today')
  @Roles('member')
  getToday(@Request() req: RequestWithUser) {
    return this.nutritionService.getToday(req.user.sub);
  }

  @Post('today/log')
  @HttpCode(HttpStatus.OK)
  @Roles('member')
  logFood(@Request() req: RequestWithUser, @Body() dto: LogFoodDto) {
    return this.nutritionService.logFood(req.user.sub, dto);
  }

  @Get('today/summary')
  @Roles('member')
  getSummary(@Request() req: RequestWithUser) {
    return this.nutritionService.getSummary(req.user.sub);
  }

  @Post('members/:memberId/assign-plan')
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'trainer')
  assignNutritionPlan(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Body() dto: AssignNutritionPlanDto,
  ) {
    return this.nutritionService.assignNutritionPlan(
      memberId,
      dto.templateId,
      req.user.sub,
      req.user.role,
    );
  }

  @Get('members/:memberId/history')
  @Roles('owner', 'trainer')
  getHistory(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
  ) {
    return this.nutritionService.getHistory(
      memberId,
      req.user.sub,
      req.user.role,
    );
  }
}
