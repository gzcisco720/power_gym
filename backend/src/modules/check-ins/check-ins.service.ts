import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { CheckIn, CheckInDocument } from '../../common/models/check-in.model';
import {
  CheckInConfig,
  CheckInConfigDocument,
} from '../../common/models/check-in-config.model';
import { User, UserDocument, UserRole } from '../../common/models/user.model';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { UpdateCheckInScheduleDto } from './dto/update-check-in-schedule.dto';

type CloudinaryUploadConfig = {
  provider: 'cloudinary';
  uploadUrl: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  cloudName: string;
};

type LocalUploadConfig = {
  provider: 'local';
  uploadUrl: string;
  folder: string;
};

export type UploadConfig = CloudinaryUploadConfig | LocalUploadConfig;

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun,1=Mon,...
  const diffToMonday = day === 0 ? 6 : day - 1;
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - diffToMonday,
    ),
  );
}

@Injectable()
export class CheckInsService {
  constructor(
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
    @InjectModel(CheckInConfig.name)
    private readonly checkInConfigModel: Model<CheckInConfigDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async findByMember(memberId: string): Promise<CheckInDocument[]> {
    return this.checkInModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ submittedAt: -1 });
  }

  async create(
    dto: CreateCheckInDto,
    memberId: string,
  ): Promise<CheckInDocument> {
    const user = await this.userModel.findById(memberId);
    if (!user) throw new NotFoundException('Member not found');

    const weekStart = getWeekStart();
    const existing = await this.checkInModel.findOne({
      memberId: new Types.ObjectId(memberId),
      submittedAt: { $gte: weekStart },
    });
    if (existing) {
      throw new ConflictException(
        'A check-in for this week has already been submitted',
      );
    }

    const memberObjId = new Types.ObjectId(memberId);
    // If the member has no assigned trainer, fall back to their own id as trainerId.
    // The CheckIn model requires a non-null ObjectId for trainerId.
    const trainerId = user.trainerId ?? memberObjId;

    return this.checkInModel.create({
      ...dto,
      memberId: memberObjId,
      trainerId,
      submittedAt: new Date(),
    });
  }

  async findByMemberScoped(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<CheckInDocument[]> {
    await this.resolveAndScopeMember(memberId, requesterId, requesterRole);

    return this.checkInModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ submittedAt: -1 });
  }

  async findPhotosForMemberScoped(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<
    {
      key: string;
      photoUrl: string;
      submittedAt: string;
      weight: number | null;
    }[]
  > {
    await this.resolveAndScopeMember(memberId, requesterId, requesterRole);

    const checkIns = await this.checkInModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ submittedAt: -1 });

    const items: {
      key: string;
      photoUrl: string;
      submittedAt: string;
      weight: number | null;
    }[] = [];

    for (const checkIn of checkIns) {
      if (!checkIn.photos || checkIn.photos.length === 0) continue;
      const checkInId = checkIn._id.toString();
      checkIn.photos.forEach((photoUrl, index) => {
        items.push({
          key: `${checkInId}-${index}`,
          photoUrl,
          submittedAt: checkIn.submittedAt.toISOString(),
          weight: checkIn.weight ?? null,
        });
      });
    }

    return items;
  }

  async findOneByMemberScoped(
    memberId: string,
    checkInId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<CheckInDocument> {
    await this.resolveAndScopeMember(memberId, requesterId, requesterRole);

    const checkIn = await this.checkInModel.findOne({
      _id: new Types.ObjectId(checkInId),
    });

    if (!checkIn || checkIn.memberId.toString() !== memberId) {
      throw new NotFoundException('Check-in not found');
    }

    return checkIn;
  }

  async getSchedule(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<CheckInConfigDocument | null> {
    await this.resolveAndScopeMember(memberId, requesterId, requesterRole);
    return this.checkInConfigModel.findOne({
      memberId: new Types.ObjectId(memberId),
    });
  }

  async updateSchedule(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
    dto: UpdateCheckInScheduleDto,
  ): Promise<CheckInConfigDocument> {
    const member = await this.resolveAndScopeMember(
      memberId,
      requesterId,
      requesterRole,
    );

    return this.checkInConfigModel.findOneAndUpdate(
      { memberId: new Types.ObjectId(memberId) },
      {
        memberId: new Types.ObjectId(memberId),
        trainerId: member.trainerId ?? new Types.ObjectId(requesterId),
        dayOfWeek: dto.dayOfWeek,
        hour: dto.hour,
        minute: dto.minute ?? 0,
        active: dto.active,
      },
      { upsert: true, returnDocument: 'after' },
    ) as Promise<CheckInConfigDocument>;
  }

  private async resolveAndScopeMember(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<UserDocument> {
    const member = await this.userModel.findById(memberId);

    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }

    if (requesterRole === 'trainer') {
      const assignedTrainerId = member.trainerId?.toString() ?? null;
      if (assignedTrainerId !== requesterId) {
        throw new NotFoundException('Member not found');
      }
    }

    return member;
  }

  getUploadSignature(): UploadConfig {
    const folder = 'check-ins';

    if (this.configService.get<string>('UPLOAD_PROVIDER') === 'local') {
      return { provider: 'local', uploadUrl: '/check-ins/upload', folder };
    }

    const secret =
      this.configService.get<string>('CLOUDINARY_API_SECRET') ?? '';
    const cloudName =
      this.configService.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY') ?? '';
    const timestamp = Math.round(Date.now() / 1000);

    const paramStr = `folder=${folder}&timestamp=${timestamp}${secret}`;
    const signature = crypto.createHash('sha1').update(paramStr).digest('hex');

    return {
      provider: 'cloudinary',
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      apiKey,
      signature,
      timestamp,
      folder,
      cloudName,
    };
  }
}
