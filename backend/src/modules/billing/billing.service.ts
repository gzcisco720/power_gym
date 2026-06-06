import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ScheduledSession,
  ScheduledSessionDocument,
} from '../../common/models/scheduled-session.model';
import {
  ServiceType,
  ServiceTypeDocument,
} from '../../common/models/service-type.model';
import { User, UserDocument } from '../../common/models/user.model';

export interface BillingLine {
  sessionId: string;
  date: Date;
  startTime: string;
  endTime: string;
  serviceTypeName: string;
  price: number;
  currency: string;
}

export interface MyBillingResult {
  memberId: string;
  from: string;
  to: string;
  total: number;
  count: number;
  currency: string;
  lines: BillingLine[];
}

export interface MemberSummary {
  memberId: string;
  name: string;
  trainerName: string;
  sessionsCount: number;
  totalAmount: number;
  currency: string;
}

export interface SummaryResult {
  members: MemberSummary[];
  grandTotal: number;
  currency: string;
}

type SessionDoc = {
  _id: Types.ObjectId;
  memberIds: Types.ObjectId[];
  trainerId: Types.ObjectId;
  serviceTypeId: Types.ObjectId | null;
  status: 'scheduled' | 'cancelled';
  date: Date;
  startTime: string;
  endTime: string;
};

type ServiceTypeDoc = {
  _id: Types.ObjectId;
  name: string;
  pricePerSession: number;
  currency: string;
};

type UserDoc = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  role: string;
  trainerId: Types.ObjectId | null;
};

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(ScheduledSession.name)
    private readonly sessionModel: Model<ScheduledSessionDocument>,
    @InjectModel(ServiceType.name)
    private readonly serviceTypeModel: Model<ServiceTypeDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private buildServiceTypeMap(
    serviceTypes: ServiceTypeDoc[],
  ): Map<string, ServiceTypeDoc> {
    const map = new Map<string, ServiceTypeDoc>();
    for (const st of serviceTypes) {
      map.set(st._id.toString(), st);
    }
    return map;
  }

  private calculateBillingLines(
    sessions: SessionDoc[],
    serviceTypeMap: Map<string, ServiceTypeDoc>,
    now: Date,
  ): BillingLine[] {
    const lines: BillingLine[] = [];
    for (const s of sessions) {
      if (s.status === 'cancelled') continue;
      if (!s.serviceTypeId) continue;
      if (s.date >= now) continue;

      const st = serviceTypeMap.get(s.serviceTypeId.toString());
      if (!st) continue;

      lines.push({
        sessionId: s._id.toString(),
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        serviceTypeName: st.name,
        price: st.pricePerSession,
        currency: st.currency,
      });
    }
    return lines;
  }

  async getMyBilling(
    memberId: string,
    from: string,
    to: string,
  ): Promise<MyBillingResult> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const now = new Date();
    const effectiveTo = toDate < now ? toDate : now;

    const sessions = await this.sessionModel
      .find({
        memberIds: new Types.ObjectId(memberId),
        date: { $gte: fromDate, $lt: effectiveTo },
      })
      .lean<SessionDoc[]>();

    const serviceTypeIds = sessions
      .filter((s) => s.serviceTypeId != null)
      .map((s) => s.serviceTypeId as Types.ObjectId);

    const serviceTypes =
      serviceTypeIds.length > 0
        ? await this.serviceTypeModel
            .find({ _id: { $in: serviceTypeIds } })
            .lean<ServiceTypeDoc[]>()
        : [];

    const stMap = this.buildServiceTypeMap(serviceTypes);
    const lines = this.calculateBillingLines(sessions, stMap, now);

    const total = lines.reduce((sum, l) => sum + l.price, 0);
    const currency = lines[0]?.currency ?? 'AUD';

    return {
      memberId,
      from,
      to,
      total,
      count: lines.length,
      currency,
      lines,
    };
  }

  async getMemberBilling(
    memberId: string,
    requesterId: string,
    requesterRole: string,
    from: string,
    to: string,
  ): Promise<MyBillingResult> {
    if (requesterRole === 'trainer') {
      const members = await this.userModel
        .find({ _id: new Types.ObjectId(memberId) })
        .lean<UserDoc[]>();
      const member = members[0];
      if (!member || member.trainerId?.toString() !== requesterId) {
        throw new NotFoundException();
      }
    }

    return this.getMyBilling(memberId, from, to);
  }

  async getSummary(
    role: string,
    requesterId: string,
    from: string,
    to: string,
  ): Promise<SummaryResult> {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const now = new Date();
    const effectiveTo = toDate < now ? toDate : now;

    const sessionQuery: Record<string, unknown> = {
      date: { $gte: fromDate, $lt: effectiveTo },
    };
    if (role === 'trainer') {
      sessionQuery.trainerId = new Types.ObjectId(requesterId);
    }

    const allSessions = await this.sessionModel
      .find(sessionQuery)
      .lean<SessionDoc[]>();

    // In-memory filter for trainer scope (defensive — DB query already scopes by trainerId)
    const sessions =
      role === 'trainer'
        ? allSessions.filter((s) => s.trainerId.toString() === requesterId)
        : allSessions;

    const serviceTypeIds = sessions
      .filter((s) => s.serviceTypeId != null)
      .map((s) => s.serviceTypeId as Types.ObjectId);

    const serviceTypes =
      serviceTypeIds.length > 0
        ? await this.serviceTypeModel
            .find({ _id: { $in: serviceTypeIds } })
            .lean<ServiceTypeDoc[]>()
        : [];

    const stMap = this.buildServiceTypeMap(serviceTypes);

    // Collect all user ids from sessions
    const memberIdSet = new Set<string>();
    const trainerIdSet = new Set<string>();
    for (const s of sessions) {
      for (const mid of s.memberIds) {
        memberIdSet.add(mid.toString());
      }
      trainerIdSet.add(s.trainerId.toString());
    }

    const allIds = [
      ...Array.from(memberIdSet).map((id) => new Types.ObjectId(id)),
      ...Array.from(trainerIdSet).map((id) => new Types.ObjectId(id)),
    ];

    const users =
      allIds.length > 0
        ? await this.userModel.find({ _id: { $in: allIds } }).lean<UserDoc[]>()
        : [];

    const userMap = new Map<string, UserDoc>();
    for (const u of users) {
      userMap.set(u._id.toString(), u);
    }

    // Group sessions by member
    const memberBillingMap = new Map<
      string,
      { sessionsCount: number; totalAmount: number; currency: string | null }
    >();

    for (const s of sessions) {
      if (s.status === 'cancelled') continue;
      if (!s.serviceTypeId) continue;
      if (s.date >= now) continue;

      const st = stMap.get(s.serviceTypeId.toString());
      if (!st) continue;

      for (const mid of s.memberIds) {
        const key = mid.toString();
        const existing = memberBillingMap.get(key);
        if (existing) {
          existing.sessionsCount += 1;
          existing.totalAmount += st.pricePerSession;
          if (!existing.currency) existing.currency = st.currency;
        } else {
          memberBillingMap.set(key, {
            sessionsCount: 1,
            totalAmount: st.pricePerSession,
            currency: st.currency,
          });
        }
      }
    }

    const members: MemberSummary[] = [];
    for (const [mid, billing] of memberBillingMap.entries()) {
      const user = userMap.get(mid);
      const name = user ? `${user.firstName} ${user.lastName}` : mid;

      // Determine trainer: find the first session for this member
      const firstSession = sessions.find(
        (s) =>
          s.memberIds.some((id) => id.toString() === mid) &&
          s.status !== 'cancelled' &&
          s.serviceTypeId != null &&
          s.date < now,
      );
      const trainerUser = firstSession
        ? userMap.get(firstSession.trainerId.toString())
        : undefined;
      const trainerName = trainerUser
        ? `${trainerUser.firstName} ${trainerUser.lastName}`
        : '';

      members.push({
        memberId: mid,
        name,
        trainerName,
        sessionsCount: billing.sessionsCount,
        totalAmount: billing.totalAmount,
        currency: billing.currency ?? 'AUD',
      });
    }

    const grandTotal = members.reduce((sum, m) => sum + m.totalAmount, 0);
    const currency = members[0]?.currency ?? 'AUD';

    return { members, grandTotal, currency };
  }
}
