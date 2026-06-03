import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { MembersService } from './members.service';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'trainer')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  listMembers(@Request() req: RequestWithUser) {
    return this.membersService.listMembers(req.user.sub, req.user.role);
  }

  @Get(':id/overview')
  getOverview(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.membersService.getOverview(id, req.user.sub, req.user.role);
  }

  @Get(':id/body-tests')
  getBodyTests(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.membersService.getBodyTests(id, req.user.sub, req.user.role);
  }

  @Get(':id/injuries')
  getInjuries(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.membersService.getInjuries(id, req.user.sub, req.user.role);
  }

  @Get(':id/medications')
  getMedications(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.membersService.getMedications(id, req.user.sub, req.user.role);
  }
}
