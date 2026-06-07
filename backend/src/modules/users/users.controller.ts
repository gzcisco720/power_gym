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
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { fileUploadOptions } from '../../common/upload/file-upload.options';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateEmailDto } from './dto/update-email.dto';

interface RequestWithUser extends Request {
  user: JwtUser;
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  getProfile(@Request() req: RequestWithUser) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Patch('me/profile')
  updateProfile(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Patch('me/email')
  changeEmail(
    @Request() req: RequestWithUser,
    @Body() dto: UpdateEmailDto,
  ) {
    return this.usersService.changeEmail(
      req.user.sub,
      dto.email,
      dto.currentPassword,
    );
  }

  @Patch('me/password')
  changePassword(
    @Request() req: RequestWithUser,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.changePassword(
      req.user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', fileUploadOptions))
  uploadAvatar(
    @Request() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const relativeUrl = `/uploads/${file.filename}`;
    return this.usersService.setAvatar(req.user.sub, relativeUrl);
  }
}
