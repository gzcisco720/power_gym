import { Injectable } from '@nestjs/common';
import { ScheduledSessionRepository } from '../repositories/scheduled-session.repository';
import { ServiceTypeRepository } from '../repositories/service-type.repository';

export interface BillingLine {
  sessionId: string;
  date: Date;
  startTime: string;
  endTime: string;
  serviceTypeName: string;
  price: number;
  currency: string;
}

export interface MemberBillingResult {
  memberId: string;
  name: string;
  trainerName: string;
  sessionsCount: number;
  totalAmount: number;
  currency: string;
  breakdown: BillingLine[];
}

export interface BillingResult {
  members: MemberBillingResult[];
  grandTotal: number;
  currency: string;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly sessionRepo: ScheduledSessionRepository,
    private readonly serviceTypeRepo: ServiceTypeRepository,
  ) {}

  async getBilling(
    from: Date,
    to: Date,
    now: Date,
    trainerIdFilter?: string,
  ): Promise<BillingResult> {
    const effectiveTo = to < now ? to : now;

    const sessions = await this.sessionRepo.findSessionsForBillingRange(
      from,
      effectiveTo,
      trainerIdFilter,
    );

    // Gather unique service type IDs
    const stIds = [
      ...new Set(
        sessions.flatMap((s) =>
          s.serviceTypeId ? [s.serviceTypeId.toString()] : [],
        ),
      ),
    ];
    const stDocs =
      stIds.length > 0 ? await this.serviceTypeRepo.findByIds(stIds) : [];
    const stMap = new Map(stDocs.map((st) => [st._id.toString(), st]));

    // Group sessions by member
    const memberSessions = new Map<string, typeof sessions>();
    for (const s of sessions) {
      for (const mid of s.memberIds) {
        const key = mid.toString();
        if (!memberSessions.has(key)) memberSessions.set(key, []);
        memberSessions.get(key)!.push(s);
      }
    }

    const memberResults: MemberBillingResult[] = Array.from(
      memberSessions.entries(),
    ).map(([memberId, mSessions]) => {
      const lines: BillingLine[] = [];
      for (const s of mSessions) {
        if (s.status === 'cancelled') continue;
        if (!s.serviceTypeId) continue;
        if (s.date >= now) continue;
        const st = stMap.get(s.serviceTypeId.toString());
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
      const totalAmount = lines.reduce((sum, l) => sum + l.price, 0);
      const currency = lines[0]?.currency ?? 'AUD';
      return {
        memberId,
        name: '',
        trainerName: '',
        sessionsCount: lines.length,
        totalAmount,
        currency,
        breakdown: lines,
      };
    });

    const grandTotal = memberResults.reduce((sum, m) => sum + m.totalAmount, 0);
    const currency = memberResults[0]?.currency ?? 'AUD';

    return { members: memberResults, grandTotal, currency };
  }
}
