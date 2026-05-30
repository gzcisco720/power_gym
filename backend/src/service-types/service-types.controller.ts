import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { ServiceTypesService } from './service-types.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

interface JwtPayload {
  sub: string;
  role: string;
}

class CreateServiceTypeDto {
  name!: string;
  durationMin!: number;
  pricePerSession!: number;
  note?: string | null;
}

class UpdateServiceTypeDto {
  name?: string;
  durationMin?: number;
  pricePerSession?: number;
  note?: string | null;
  isActive?: boolean;
}

@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly svc: ServiceTypesService) {}

  @Get()
  @Roles('owner')
  async list() {
    const serviceTypes = await this.svc.list();
    return { serviceTypes };
  }

  @Post()
  @Roles('owner')
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreateServiceTypeDto,
  ) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestException('name is required');
    }
    if (typeof body.durationMin !== 'number' || body.durationMin < 1) {
      throw new BadRequestException('durationMin must be a positive number');
    }
    if (typeof body.pricePerSession !== 'number' || body.pricePerSession < 0) {
      throw new BadRequestException(
        'pricePerSession must be a non-negative number',
      );
    }

    const serviceType = await this.svc.create({
      name: body.name.trim(),
      durationMin: body.durationMin,
      pricePerSession: body.pricePerSession,
      note:
        typeof body.note === 'string' && body.note.trim()
          ? body.note.trim()
          : null,
      createdBy: user.sub,
    });
    return { serviceType };
  }

  @Get('active')
  @Roles('owner', 'trainer')
  async listActive() {
    const serviceTypes = await this.svc.listActive();
    return { serviceTypes };
  }

  @Patch(':id')
  @Roles('owner')
  async update(@Param('id') id: string, @Body() body: UpdateServiceTypeDto) {
    if (typeof body.durationMin === 'number' && body.durationMin < 1) {
      throw new BadRequestException('durationMin must be at least 1');
    }
    if (typeof body.pricePerSession === 'number' && body.pricePerSession < 0) {
      throw new BadRequestException('pricePerSession must be non-negative');
    }

    const updated = await this.svc.update(id, {
      ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
      ...(typeof body.durationMin === 'number'
        ? { durationMin: body.durationMin }
        : {}),
      ...(typeof body.pricePerSession === 'number'
        ? { pricePerSession: body.pricePerSession }
        : {}),
      ...('note' in body ? { note: body.note ?? null } : {}),
      ...(typeof body.isActive === 'boolean'
        ? { isActive: body.isActive }
        : {}),
    });
    if (!updated) throw new NotFoundException('Not found');
    return { serviceType: updated };
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles('owner')
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    return { success: true };
  }
}
