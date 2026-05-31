import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { fileUploadOptions } from '../../common/upload/file-upload.options';
import { GymService } from './gym.service';
import { UpdateGymInfoDto } from './dto/update-gym-info.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@Controller('gym')
export class GymController {
  constructor(private readonly gymService: GymService) {}

  @UseGuards(JwtAuthGuard)
  @Get('branding')
  getBranding() {
    return this.gymService.getBranding();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Get('info')
  getInfo(@Request() req: RequestWithUser) {
    return this.gymService.getInfo(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Patch('info')
  updateInfo(@Request() req: RequestWithUser, @Body() dto: UpdateGymInfoDto) {
    return this.gymService.updateInfo(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @Post('logo')
  @UseInterceptors(FileInterceptor('file', fileUploadOptions))
  uploadLogo(
    @Request() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('kind') kind: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    if (kind !== 'sidebar' && kind !== 'login') {
      throw new BadRequestException('kind must be "sidebar" or "login"');
    }
    const relativeUrl = `/uploads/${file.filename}`;
    return this.gymService.setLogo(req.user.sub, kind, relativeUrl);
  }
}
