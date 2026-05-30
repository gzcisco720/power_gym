import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CheckInRepository } from '../repositories/check-in.repository';
import type { CreateCheckInData } from '../repositories/check-in.repository';
import { UserRepository } from '../repositories/user.repository';
import type { ICheckIn } from '../database/models/check-in.model';
import type { UserRole } from '../common/interfaces/auth-user.interface';

type CheckInInput = Omit<CreateCheckInData, 'memberId' | 'trainerId'>;

@Injectable()
export class CheckInsService {
  constructor(
    private readonly repo: CheckInRepository,
    private readonly userRepo: UserRepository,
  ) {}

  private async assertAccess(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    if (requesterRole === 'owner') return;
    if (requesterRole === 'member') {
      if (requesterId !== memberId) throw new ForbiddenException();
      return;
    }
    const member = await this.userRepo.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');
    if (member.trainerId?.toString() !== requesterId) {
      throw new ForbiddenException();
    }
  }

  async list(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<ICheckIn[]> {
    await this.assertAccess(memberId, requesterId, requesterRole);
    return this.repo.findByMember(memberId);
  }

  async create(memberId: string, data: CheckInInput): Promise<ICheckIn> {
    const member = await this.userRepo.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');
    const trainerId = member.trainerId?.toString() ?? memberId;
    return this.repo.create({ ...data, memberId, trainerId });
  }
}
