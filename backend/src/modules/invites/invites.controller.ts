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
import { InvitesService, TrainerOption } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('invites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get()
  @Roles('owner', 'trainer')
  findMine(@Request() req: RequestWithUser) {
    return this.invitesService.findMine(req.user.sub);
  }

  @Get('trainers')
  @Roles('owner')
  listTrainers(): Promise<TrainerOption[]> {
    return this.invitesService.listTrainers();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'trainer')
  create(@Request() req: RequestWithUser, @Body() dto: CreateInviteDto) {
    return this.invitesService.create(dto, req.user.role, req.user.sub);
  }

  @Delete(':id')
  @Roles('owner', 'trainer')
  revoke(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.invitesService.revoke(id, req.user.sub);
  }
}
