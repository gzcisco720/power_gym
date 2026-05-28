import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ICheckInConfig,
  CHECK_IN_CONFIG_MODEL,
} from '../database/models/check-in-config.model';

export interface UpsertCheckInConfigData {
  dayOfWeek: number;
  hour: number;
  minute: number;
  active: boolean;
}

@Injectable()
export class CheckInConfigRepository {
  constructor(
    @InjectModel(CHECK_IN_CONFIG_MODEL)
    private readonly model: Model<ICheckInConfig>,
  ) {}

  async upsert(
    memberId: string,
    trainerId: string,
    data: UpsertCheckInConfigData,
  ): Promise<ICheckInConfig> {
    const result = await this.model.findOneAndUpdate(
      { memberId: new Types.ObjectId(memberId) },
      {
        $set: {
          trainerId: new Types.ObjectId(trainerId),
          dayOfWeek: data.dayOfWeek,
          hour: data.hour,
          minute: data.minute,
          active: data.active,
        },
      },
      { upsert: true, new: true },
    );
    return result;
  }
}
