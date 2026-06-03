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
import { NutritionTemplatesService } from './nutrition-templates.service';
import { CreateNutritionTemplateDto } from './dto/create-nutrition-template.dto';
import { UpdateNutritionTemplateDto } from './dto/update-nutrition-template.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('nutrition-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'trainer')
export class NutritionTemplatesController {
  constructor(
    private readonly nutritionTemplatesService: NutritionTemplatesService,
  ) {}

  @Get()
  findOwn(@Request() req: RequestWithUser) {
    return this.nutritionTemplatesService.findOwn(req.user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Request() req: RequestWithUser,
    @Body() dto: CreateNutritionTemplateDto,
  ) {
    return this.nutritionTemplatesService.create(dto, req.user.sub);
  }

  @Patch(':id')
  update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateNutritionTemplateDto,
  ) {
    return this.nutritionTemplatesService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.nutritionTemplatesService.remove(id, req.user.sub);
  }
}
