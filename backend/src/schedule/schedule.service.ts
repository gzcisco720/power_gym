import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { UserRepository } from '../repositories/user.repository';
import { IScheduledSession } from '../database/models/scheduled-session.model';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(
    private readonly sessionRepo: ScheduledSessionRepository,
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

  async create(
    caller: AuthUser,
    dto: CreateScheduleDto,
  ): Promise<IScheduledSession> {
    if (caller.role === 'trainer') {
      const members = await Promise.all(
        dto.memberIds.map((id) => this.userRepo.findById(id)),
      );
      for (const member of members) {
        if (!member || member.trainerId?.toString() !== caller.userId) {
          throw new NotFoundException('Member not found');
        }
      }
    }
    return this.sessionRepo.create({
      trainerId: caller.userId,
      memberIds: dto.memberIds,
      date: new Date(dto.date),
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
  }

  async getMemberCalendar(
    caller: AuthUser,
    memberId: string,
  ): Promise<IScheduledSession[]> {
    // Member can only see their own calendar; trainer/owner can see any member they own
    if (caller.role === 'member') {
      if (caller.userId !== memberId) {
        throw new ForbiddenException('Access denied');
      }
    } else {
      await this.assertTrainerOwnsMember(caller, memberId);
    }
    return this.sessionRepo.findByMember(memberId);
  }

  async cancel(
    caller: AuthUser,
    sessionId: string,
  ): Promise<IScheduledSession> {
    let session: IScheduledSession | null;

    if (caller.role === 'owner') {
      // Owner can cancel any session — find by id only
      session = await this.sessionRepo.cancelById(sessionId);
    } else {
      // Trainer must own the session
      const existing = await this.sessionRepo.findByIdAndTrainer(
        sessionId,
        caller.userId,
      );
      if (!existing) throw new NotFoundException('Session not found');
      session = await this.sessionRepo.cancelById(sessionId);
    }

    if (!session) throw new NotFoundException('Session not found');
    return session;
  }
}
