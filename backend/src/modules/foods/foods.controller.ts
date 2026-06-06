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
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { FoodsService } from './foods.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { SearchFoodsDto } from './dto/search-foods.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('foods')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'trainer')
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Get()
  search(@Request() req: RequestWithUser, @Query() query: SearchFoodsDto) {
    return this.foodsService.search(
      query.q ?? '',
      req.user.sub,
      query.limit ?? 20,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: RequestWithUser, @Body() dto: CreateFoodDto) {
    return this.foodsService.create(dto, req.user.sub);
  }

  @Patch(':id')
  update(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateFoodDto,
  ) {
    return this.foodsService.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.foodsService.remove(id, req.user.sub);
  }
}
