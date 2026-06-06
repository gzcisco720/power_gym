import {
  Body,
  Controller,
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
import { CheckInsService } from './check-ins.service';
import { CreateCheckInDto } from './dto/create-check-in.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('check-ins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Get()
  @Roles('member')
  findAll(@Request() req: RequestWithUser) {
    return this.checkInsService.findByMember(req.user.sub);
  }

  @Post()
  @Roles('member')
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: RequestWithUser, @Body() dto: CreateCheckInDto) {
    return this.checkInsService.create(dto, req.user.sub);
  }

  @Post('upload-signature')
  @Roles('member')
  @HttpCode(HttpStatus.OK)
  getUploadSignature() {
    return this.checkInsService.getUploadSignature();
  }

  @Get('members/:memberId')
  @Roles('owner', 'trainer')
  findMemberCheckIns(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
  ) {
    return this.checkInsService.findByMemberScoped(
      memberId,
      req.user.sub,
      req.user.role,
    );
  }

  @Get('members/:memberId/:id')
  @Roles('owner', 'trainer')
  findMemberCheckIn(
    @Request() req: RequestWithUser,
    @Param('memberId') memberId: string,
    @Param('id') id: string,
  ) {
    return this.checkInsService.findOneByMemberScoped(
      memberId,
      id,
      req.user.sub,
      req.user.role,
    );
  }
}
