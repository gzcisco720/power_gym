import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
@Roles('member')
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Get()
  findAll(@Request() req: RequestWithUser) {
    return this.checkInsService.findByMember(req.user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: RequestWithUser, @Body() dto: CreateCheckInDto) {
    return this.checkInsService.create(dto, req.user.sub);
  }

  @Post('upload-signature')
  @HttpCode(HttpStatus.OK)
  getUploadSignature() {
    return this.checkInsService.getUploadSignature();
  }
}
