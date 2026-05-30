import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import type { IScheduledSession } from '../database/models/scheduled-session.model';
import type { UpdateScheduledSessionData } from '../repositories/scheduled-session.repository';

export interface CreateSessionInput {
  trainerId: string;
  memberIds: string[];
  date: Date;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  serviceTypeId: string | null;
  customServiceName: string | null;
  customFee: number | null;
}

export type Scope = 'one' | 'future' | 'all';

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

@Injectable()
export class ScheduleService {
  constructor(private readonly repo: ScheduledSessionRepository) {}

  async create(
    input: CreateSessionInput,
  ): Promise<{ sessions: IScheduledSession[] }> {
    const {
      trainerId,
      memberIds,
      date,
      startTime,
      endTime,
      isRecurring,
      serviceTypeId,
      customServiceName,
      customFee,
    } = input;

    if (!isRecurring) {
      const doc = await this.repo.create({
        seriesId: null,
        trainerId,
        memberIds,
        date,
        startTime,
        endTime,
        serviceTypeId,
        customServiceName,
        customFee,
      });
      return { sessions: [doc] };
    }

    const seriesId = randomBytes(12).toString('hex');
    const sessions = Array.from({ length: 12 }, (_, i) => ({
      seriesId,
      trainerId,
      memberIds,
      date: addWeeks(date, i),
      startTime,
      endTime,
      serviceTypeId,
      customServiceName,
      customFee,
    }));

    const docs = await this.repo.createMany(sessions);
    return { sessions: docs };
  }

  async getRange(
    start: Date,
    end: Date,
    requester: { role: string; userId: string },
  ): Promise<{ sessions: IScheduledSession[] }> {
    let sessions: IScheduledSession[];
    if (requester.role === 'trainer') {
      sessions = await this.repo.findByDateRange(start, end, {
        trainerId: requester.userId,
      });
    } else if (requester.role === 'member') {
      sessions = await this.repo.findByDateRange(start, end, {
        memberId: requester.userId,
      });
    } else {
      sessions = await this.repo.findByDateRange(start, end);
    }
    return { sessions };
  }

  async deleteSession(id: string, scope: Scope): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Not found');

    const seriesId = existing.seriesId?.toString();

    if (scope === 'one') {
      await this.repo.cancelOne(id);
    } else if (seriesId) {
      if (scope === 'future') {
        await this.repo.cancelFuture(seriesId, existing.date);
      } else {
        await this.repo.cancelAll(seriesId);
      }
    } else {
      throw new BadRequestException(
        'Session is not part of a recurring series',
      );
    }
  }

  async updateSession(
    id: string,
    scope: Scope,
    data: UpdateScheduledSessionData,
  ): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Not found');

    const seriesId = existing.seriesId?.toString();

    if (scope === 'one') {
      await this.repo.updateOne(id, data);
    } else if (seriesId) {
      if (scope === 'future') {
        await this.repo.updateFuture(seriesId, existing.date, data);
      } else {
        await this.repo.updateAll(seriesId, data);
      }
    } else {
      throw new BadRequestException(
        'Session is not part of a recurring series',
      );
    }
  }
}
