import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';

class TestDto {
  @IsString()
  name!: string;
}

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }

  @Post('test-validation')
  @Public()
  testValidation(@Body() dto: TestDto): { ok: boolean } {
    void dto;
    return { ok: true };
  }
}
