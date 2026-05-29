import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { ServiceTypeRepository } from '../repositories/service-type.repository';
import { UserRepository } from '../repositories/user.repository';
import { BillingLine, calculateMemberBilling } from './calculate-billing';
import { CreateServiceTypeDto } from './dto/create-service-type.dto';
import { IServiceType } from '../database/models/service-type.model';

@Injectable()
export class BillingService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly serviceTypeRepo: ServiceTypeRepository,
    private readonly scheduledSessionRepo: ScheduledSessionRepository,
  ) {}

  async createServiceType(
    caller: AuthUser,
    dto: CreateServiceTypeDto,
  ): Promise<IServiceType> {
    return this.serviceTypeRepo.create({
      name: dto.name.trim(),
      durationMin: dto.durationMin,
      pricePerSession: dto.pricePerSession,
      note: dto.note?.trim() ?? null,
      createdBy: caller.userId,
    });
  }

  async findActiveServiceTypes(): Promise<IServiceType[]> {
    return this.serviceTypeRepo.findActive();
  }

  async deleteServiceType(id: string): Promise<void> {
    await this.serviceTypeRepo.delete(id);
  }

  async getMemberBilling(
    caller: AuthUser,
    memberId: string,
    from?: Date,
    to?: Date,
  ): Promise<{
    memberId: string;
    from: string;
    to: string;
    total: number;
    count: number;
    currency: string;
    lines: BillingLine[];
  }> {
    if (caller.role === 'member' && caller.userId !== memberId) {
      throw new ForbiddenException('Access denied');
    }
    if (caller.role === 'trainer') {
      const member = await this.userRepo.findById(memberId);
      if (!member || member.trainerId?.toString() !== caller.userId) {
        throw new NotFoundException('Member not found');
      }
    }

    const now = new Date();
    const effectiveFrom =
      from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const effectiveTo = to && to < now ? to : now;

    const sessions = await this.scheduledSessionRepo.findForBilling(
      memberId,
      effectiveFrom,
      effectiveTo,
    );

    const stIds = [
      ...new Set(
        sessions
          .map((s) => s.serviceTypeId?.toString())
          .filter((id): id is string => !!id),
      ),
    ];
    const stDocs = await this.serviceTypeRepo.findByIds(stIds);
    const stMap = new Map(stDocs.map((st) => [st._id.toString(), st]));

    const billingSessions = sessions.map((s) => {
      const stId = s.serviceTypeId?.toString();
      const st = stId ? stMap.get(stId) : undefined;
      return {
        _id: s._id.toString(),
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        serviceType: st
          ? {
              _id: st._id.toString(),
              name: st.name,
              pricePerSession: st.pricePerSession,
              currency: st.currency,
            }
          : null,
      };
    });

    const billing = calculateMemberBilling(billingSessions, now);

    return {
      memberId,
      from: effectiveFrom.toISOString(),
      to: effectiveTo.toISOString(),
      total: billing.total,
      count: billing.count,
      currency: billing.currency,
      lines: billing.lines,
    };
  }
}
