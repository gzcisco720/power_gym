import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  BodyTestsService,
  type CreateBodyTestInput,
} from './body-tests.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

interface JwtPayload {
  sub: string;
  role: string;
}

class CreateBodyTestDto {
  protocol!: '3site' | '7site' | '9site' | 'other';
  sex?: 'male' | 'female';
  age?: number;
  weight!: number;
  date!: string;
  bodyFatPct?: number;
  tricep?: number;
  chest?: number;
  subscapular?: number;
  abdominal?: number;
  suprailiac?: number;
  thigh?: number;
  midaxillary?: number;
  bicep?: number;
  lumbar?: number;
  targetWeight?: number | null;
  targetBodyFatPct?: number | null;
}

@Controller('members/:memberId/body-tests')
export class BodyTestsController {
  constructor(private readonly svc: BodyTestsService) {}

  @Get()
  @Roles('owner', 'trainer', 'member')
  async list(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
  ) {
    if (user.role === 'member' && user.sub !== memberId) {
      throw new ForbiddenException();
    }
    return this.svc.list(memberId);
  }

  @Get('export')
  @Roles('owner', 'trainer')
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Res() res: Response,
  ) {
    const csv = await this.svc.exportCsvForMember(
      memberId,
      user.sub,
      user.role as 'owner' | 'trainer',
    );
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="body-tests-${memberId}.csv"`,
    });
    res.send(csv);
  }

  @Post()
  @Roles('owner', 'trainer')
  @HttpCode(201)
  async create(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Body() body: CreateBodyTestDto,
  ) {
    if (!body.protocol) throw new BadRequestException('protocol is required');
    if (body.weight == null)
      throw new BadRequestException('weight is required');
    if (!body.date) throw new BadRequestException('date is required');

    const input: CreateBodyTestInput = {
      memberId,
      trainerId: user.sub,
      date: new Date(body.date),
      age: body.age ?? 0,
      sex: body.sex ?? 'male',
      weight: body.weight,
      protocol: body.protocol,
      bodyFatPct: body.bodyFatPct,
      tricep: body.tricep ?? null,
      chest: body.chest ?? null,
      subscapular: body.subscapular ?? null,
      abdominal: body.abdominal ?? null,
      suprailiac: body.suprailiac ?? null,
      thigh: body.thigh ?? null,
      midaxillary: body.midaxillary ?? null,
      bicep: body.bicep ?? null,
      lumbar: body.lumbar ?? null,
      targetWeight: body.targetWeight ?? null,
      targetBodyFatPct: body.targetBodyFatPct ?? null,
    };

    return this.svc.createForMember(
      input,
      user.sub,
      user.role as 'owner' | 'trainer',
    );
  }

  @Delete(':testId')
  @HttpCode(204)
  @Roles('owner', 'trainer')
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Param('testId') testId: string,
  ) {
    const tests = await this.svc.list(memberId);
    const test = tests.find((t) => t._id.toString() === testId);
    if (!test) throw new NotFoundException('Not found');
  }
}

@Controller('me/body-tests')
export class MeBodyTestsController {
  constructor(private readonly svc: BodyTestsService) {}

  @Get()
  @Roles('owner', 'trainer', 'member')
  async list(@CurrentUser() user: JwtPayload) {
    return this.svc.list(user.sub);
  }

  @Get('export')
  @Roles('owner', 'trainer', 'member')
  async export(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const csv = await this.svc.exportCsv(user.sub);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="my-body-tests.csv"',
    });
    res.send(csv);
  }
}
