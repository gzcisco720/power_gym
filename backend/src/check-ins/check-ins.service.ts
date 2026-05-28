import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { CheckInRepository } from '../repositories/check-in.repository';
import { CheckInConfigRepository } from '../repositories/check-in-config.repository';
import { UserRepository } from '../repositories/user.repository';
import { ICheckIn } from '../database/models/check-in.model';
import { ICheckInConfig } from '../database/models/check-in-config.model';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { UpdateCheckInConfigDto } from './dto/update-check-in-config.dto';

@Injectable()
export class CheckInsService {
  constructor(
    private readonly checkInRepo: CheckInRepository,
    private readonly checkInConfigRepo: CheckInConfigRepository,
    private readonly userRepo: UserRepository,
  ) {}

  private async assertTrainerOwnsMember(
    caller: AuthUser,
    memberId: string,
  ): Promise<void> {
    if (caller.role === 'owner') return;
    if (caller.role === 'trainer') {
      const member = await this.userRepo.findById(memberId);
      if (!member || member.trainerId?.toString() !== caller.userId) {
        throw new NotFoundException('Member not found');
      }
    }
  }

  async create(caller: AuthUser, dto: CreateCheckInDto): Promise<ICheckIn> {
    // Fetch member's trainerId
    const member = await this.userRepo.findById(caller.userId);
    if (!member) throw new NotFoundException('Member not found');
    const trainerId = member.trainerId?.toString() ?? caller.userId;

    // Duplicate check: UTC day boundaries
    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const exists = await this.checkInRepo.existsForDay(
      caller.userId,
      dayStart,
      dayEnd,
    );
    if (exists) {
      throw new ConflictException('Check-in already submitted today');
    }

    return this.checkInRepo.create({
      memberId: caller.userId,
      trainerId,
      submittedAt: now,
      sleepQuality: dto.sleepQuality,
      stress: dto.stress,
      fatigue: dto.fatigue,
      hunger: dto.hunger,
      recovery: dto.recovery,
      energy: dto.energy,
      digestion: dto.digestion,
      weight: dto.weight ?? null,
      waist: dto.waist ?? null,
      steps: dto.steps ?? null,
      exerciseMinutes: dto.exerciseMinutes ?? null,
      walkRunDistance: dto.walkRunDistance ?? null,
      sleepHours: dto.sleepHours ?? null,
      dietDetails: dto.dietDetails ?? '',
      stuckToDiet: dto.stuckToDiet,
      wellbeing: dto.wellbeing ?? '',
      notes: dto.notes ?? '',
      photos: [],
    });
  }

  async listMyCheckIns(caller: AuthUser): Promise<ICheckIn[]> {
    return this.checkInRepo.findByMember(caller.userId);
  }

  async upsertConfig(
    caller: AuthUser,
    dto: UpdateCheckInConfigDto,
  ): Promise<ICheckInConfig> {
    await this.assertTrainerOwnsMember(caller, dto.memberId);
    return this.checkInConfigRepo.upsert(dto.memberId, caller.userId, {
      dayOfWeek: dto.dayOfWeek,
      hour: dto.hour,
      minute: dto.minute,
      active: dto.active,
    });
  }
}
