import { Injectable } from '@nestjs/common';
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

export interface SessionDto {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  trainerName: string;
  serviceTypeName: string | null;
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

    return {
      _id: session._id.toString(),
      date: session.date.toISOString(),
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      trainerName,
      serviceTypeName,
      isRecurring: session.seriesId !== null,
    };
  }
}
