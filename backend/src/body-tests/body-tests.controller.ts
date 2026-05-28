import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Types } from 'mongoose';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { BodyTestsService } from './body-tests.service';
import { CreateBodyTestDto } from './dto/create-body-test.dto';

@Controller()
export class BodyTestsController {
  constructor(private readonly bodyTestsService: BodyTestsService) {}

  // ── Member Body Tests ────────────────────────────────────────

  @Roles('owner', 'trainer')
  @Post('members/:memberId/body-tests')
  @HttpCode(HttpStatus.CREATED)
  createBodyTest(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Body() dto: CreateBodyTestDto,
  ) {
    return this.bodyTestsService.createBodyTest(user, memberId.toString(), dto);
  }

  @Roles('owner', 'trainer')
  @Get('members/:memberId/body-tests')
  listBodyTests(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
  ) {
    return this.bodyTestsService.listBodyTests(user, memberId.toString());
  }

  @Roles('owner', 'trainer')
  @Delete('members/:memberId/body-tests/:testId')
  @HttpCode(HttpStatus.OK)
  async deleteBodyTest(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Param('testId', ParseObjectIdPipe) testId: Types.ObjectId,
  ) {
    await this.bodyTestsService.deleteBodyTest(
      user,
      memberId.toString(),
      testId.toString(),
    );
    return { message: 'Deleted' };
  }

  // ── Self Body Tests Export ───────────────────────────────────

  @Get('me/body-tests/export')
  async exportMeBodyTestsCsv(
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const csv = await this.bodyTestsService.exportMeBodyTestsCsv(user);
    res
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader(
        'Content-Disposition',
        'attachment; filename="my-body-tests.csv"',
      )
      .send(csv);
  }

  // ── Member Body Tests Export (trainer/owner) ─────────────────

  @Roles('owner', 'trainer')
  @Get('members/:memberId/body-tests/export')
  async exportMemberBodyTestsCsv(
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseObjectIdPipe) memberId: Types.ObjectId,
    @Res() res: Response,
  ) {
    const csv = await this.bodyTestsService.exportMemberBodyTestsCsv(
      user,
      memberId.toString(),
    );
    const mid = memberId.toString();
    res
      .setHeader('Content-Type', 'text/csv; charset=utf-8')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="body-tests-${mid}.csv"`,
      )
      .send(csv);
  }
}
