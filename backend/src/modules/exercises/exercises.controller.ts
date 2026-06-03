import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('exercises')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'trainer')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  search(@Request() req: RequestWithUser, @Query('q') q: string | undefined) {
    return this.exercisesService.search(q ?? '', req.user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: RequestWithUser, @Body() dto: CreateExerciseDto) {
    return this.exercisesService.create(dto, req.user.sub);
  }
}
