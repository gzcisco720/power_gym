import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { BodyTestsService } from './body-tests.service';
import { CreateBodyTestDto } from './dto/create-body-test.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('body-tests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BodyTestsController {
  constructor(private readonly bodyTestsService: BodyTestsService) {}

  @Get('me')
  @Roles('member', 'owner')
  findMine(@Request() req: RequestWithUser) {
    return this.bodyTestsService.findByMember(req.user.sub);
  }

  @Post()
  @Roles('owner')
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: RequestWithUser, @Body() dto: CreateBodyTestDto) {
    return this.bodyTestsService.create(dto, req.user.sub);
  }

  @Delete(':id')
  @Roles('owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.bodyTestsService.remove(id, req.user.sub);
  }
}
