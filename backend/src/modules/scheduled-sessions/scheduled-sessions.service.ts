import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ScheduledSession,
  ScheduledSessionDocument,
} from '../../common/models/scheduled-session.model';
import { User, UserDocument } from '../../common/models/user.model';
import {
  ServiceType,
  ServiceTypeDocument,
} from '../../common/models/service-type.model';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

export interface SessionDto {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  trainerId: string;
  trainerName: string;
  memberIds: string[];
  memberNames: string[];
  serviceTypeId: string | null;
  serviceTypeName: string | null;
  customServiceName: string | null;
  seriesId: string | null;
  isRecurring: boolean;
}

@Injectable()
export class ScheduledSessionsService {
  constructor(
    @InjectModel(ScheduledSession.name)
    private readonly sessionModel: Model<ScheduledSessionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(ServiceType.name)
    private readonly serviceTypeModel: Model<ServiceTypeDocument>,
  ) {}

  async findForMember(memberId: string): Promise<SessionDto[]> {
    const sessions = await this.sessionModel
      .find({ memberIds: new Types.ObjectId(memberId) })
      .sort({ date: 1 });

    return Promise.all(sessions.map((session) => this.toDto(session)));
  }

  async listForStaff(
    role: 'owner' | 'trainer',
    callerId: string | undefined,
    range: 'upcoming' | 'past' = 'upcoming',
  ): Promise<SessionDto[]> {
    const now = new Date();
    const dateFilter = range === 'upcoming' ? { $gte: now } : { $lt: now };

    const query: Record<string, unknown> = { date: dateFilter };
    if (role === 'trainer' && callerId) {
      query['trainerId'] = new Types.ObjectId(callerId);
    }

    const sessions = await this.sessionModel.find(query).sort({ date: 1 });

    return Promise.all(sessions.map((session) => this.toDto(session)));
  }

  async createSession(
    dto: CreateSessionDto,
    callerRole: 'owner' | 'trainer',
    callerId: string,
  ): Promise<SessionDto[]> {
    // Trainer always creates for themselves
    const resolvedTrainerId =
      callerRole === 'trainer' ? callerId : (dto.trainerId ?? callerId);

    const trainerObjId = new Types.ObjectId(resolvedTrainerId);
    const memberObjIds = dto.memberIds.map((id) => new Types.ObjectId(id));
    const serviceTypeObjId = dto.serviceTypeId
      ? new Types.ObjectId(dto.serviceTypeId)
      : null;

    const baseDate = new Date(dto.date);
    const count = dto.recurrence ? dto.recurrence.weeks : 1;
    const seriesId = count > 1 ? new Types.ObjectId() : null;

    const created: ScheduledSessionDocument[] = [];
    for (let i = 0; i < count; i++) {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(sessionDate.getDate() + i * 7);

      const doc = await this.sessionModel.create({
        seriesId,
        trainerId: trainerObjId,
        memberIds: memberObjIds,
        date: sessionDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: 'scheduled',
        serviceTypeId: serviceTypeObjId,
        customServiceName: dto.customServiceName ?? null,
        customFee: null,
        reminderSentAt: null,
      });
      created.push(doc);
    }

    return Promise.all(created.map((s) => this.toDto(s)));
  }

  async updateSession(
    id: string,
    dto: UpdateSessionDto,
    callerRole: 'owner' | 'trainer',
    callerId: string,
  ): Promise<SessionDto> {
    const session = await this.sessionModel.findById(new Types.ObjectId(id));
    if (!session) throw new NotFoundException('Session not found');

    if (callerRole === 'trainer' && session.trainerId.toString() !== callerId) {
      throw new ForbiddenException("Cannot edit another trainer's session");
    }

    const { scope, ...fields } = dto;
    const updateFields: Record<string, unknown> = {};
    if (fields.date !== undefined) updateFields['date'] = new Date(fields.date);
    if (fields.startTime !== undefined)
      updateFields['startTime'] = fields.startTime;
    if (fields.endTime !== undefined) updateFields['endTime'] = fields.endTime;
    if (fields.memberIds !== undefined) {
      updateFields['memberIds'] = fields.memberIds.map(
        (mid) => new Types.ObjectId(mid),
      );
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'serviceTypeId')) {
      updateFields['serviceTypeId'] = fields.serviceTypeId
        ? new Types.ObjectId(fields.serviceTypeId)
        : null;
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'customServiceName')) {
      updateFields['customServiceName'] = fields.customServiceName ?? null;
    }

    if (scope === 'series' && session.seriesId) {
      await this.sessionModel.updateMany(
        { seriesId: session.seriesId },
        updateFields,
      );
      // Re-fetch to return updated doc
      const updated = await this.sessionModel.findById(new Types.ObjectId(id));
      if (!updated)
        throw new NotFoundException('Session not found after update');
      return this.toDto(updated);
    }

    Object.assign(session, updateFields);
    const saved = await session.save();
    return this.toDto(saved);
  }

  async deleteSession(
    id: string,
    scope: 'single' | 'series',
    callerRole: 'owner' | 'trainer',
    callerId: string,
  ): Promise<void> {
    const session = await this.sessionModel.findById(new Types.ObjectId(id));
    if (!session) throw new NotFoundException('Session not found');

    if (callerRole === 'trainer' && session.trainerId.toString() !== callerId) {
      throw new ForbiddenException("Cannot delete another trainer's session");
    }

    if (scope === 'series' && session.seriesId) {
      await this.sessionModel.deleteMany({ seriesId: session.seriesId });
    } else {
      await this.sessionModel.deleteMany({ _id: new Types.ObjectId(id) });
    }
  }

  private async toDto(session: ScheduledSessionDocument): Promise<SessionDto> {
    const trainer = await this.userModel.findById(session.trainerId);
    const trainerName = trainer
      ? `${trainer.firstName} ${trainer.lastName}`
      : 'Trainer';

    let serviceTypeName: string | null = null;
    if (session.serviceTypeId) {
      const st = await this.serviceTypeModel.findById(session.serviceTypeId);
      serviceTypeName = st ? st.name : null;
    } else if (session.customServiceName) {
      serviceTypeName = session.customServiceName;
    }

    // Resolve member names
    const memberNames: string[] = [];
    if (session.memberIds && session.memberIds.length > 0) {
      const members = await this.userModel.find({
        _id: { $in: session.memberIds },
      });
      for (const m of members) {
        memberNames.push(`${m.firstName} ${m.lastName}`);
      }
    }

    return {
      _id: session._id.toString(),
      date: session.date.toISOString(),
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      trainerId: session.trainerId.toString(),
      trainerName,
      memberIds: session.memberIds.map((id) => id.toString()),
      memberNames,
      serviceTypeId: session.serviceTypeId
        ? session.serviceTypeId.toString()
        : null,
      serviceTypeName,
      customServiceName: session.customServiceName,
      seriesId: session.seriesId ? session.seriesId.toString() : null,
      isRecurring: session.seriesId !== null,
    };
  }
}
