import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CheckInConfigRepository } from '../repositories/check-in-config.repository';
import type { UpsertCheckInConfigData } from '../repositories/check-in-config.repository';
import { UserRepository } from '../repositories/user.repository';
import type { ICheckInConfig } from '../database/models/check-in-config.model';
import type { UserRole } from '../common/interfaces/auth-user.interface';

@Injectable()
export class CheckInConfigService {
  constructor(
    private readonly repo: CheckInConfigRepository,
    private readonly userRepo: UserRepository,
  ) {}

  private async assertTrainerAccess(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<string> {
    if (requesterRole === 'owner') return requesterId;
    if (requesterRole === 'member') {
      if (requesterId !== memberId) throw new ForbiddenException();
      return requesterId;
    }
    const member = await this.userRepo.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');
    if (member.trainerId?.toString() !== requesterId) {
      throw new ForbiddenException();
    }
    return requesterId;
  }

  async get(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<ICheckInConfig | null> {
    await this.assertTrainerAccess(memberId, requesterId, requesterRole);
    return this.repo.findByMember(memberId);
  }

  async upsert(
    memberId: string,
    data: UpsertCheckInConfigData,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<ICheckInConfig> {
    const trainerId = await this.assertTrainerAccess(
      memberId,
      requesterId,
      requesterRole,
    );
    return this.repo.upsert(memberId, trainerId, data);
  }
}
