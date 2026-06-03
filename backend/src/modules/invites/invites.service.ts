import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  InviteToken,
  InviteTokenDocument,
} from '../../common/models/invite-token.model';
import { User, UserDocument } from '../../common/models/user.model';
import { CreateInviteDto } from './dto/create-invite.dto';

export interface TrainerOption {
  _id: Types.ObjectId;
  name: string;
}

@Injectable()
export class InvitesService {
  constructor(
    @InjectModel(InviteToken.name)
    private readonly inviteModel: Model<InviteTokenDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    dto: CreateInviteDto,
    userRole: string,
    userId: string,
  ): Promise<InviteTokenDocument> {
    if (userRole === 'trainer') {
      if (dto.role !== 'member') {
        throw new ForbiddenException('Trainers may only invite members');
      }
    }

    let trainerId: Types.ObjectId | null = null;

    if (dto.role === 'member') {
      if (userRole === 'trainer') {
        trainerId = new Types.ObjectId(userId);
      } else {
        if (!dto.trainerId) {
          throw new BadRequestException(
            'trainerId is required when inviting a member',
          );
        }
        trainerId = new Types.ObjectId(dto.trainerId);
      }
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    return this.inviteModel.create({
      token: randomUUID(),
      role: dto.role,
      recipientEmail: dto.recipientEmail,
      expiresAt,
      usedAt: null,
      invitedBy: new Types.ObjectId(userId),
      trainerId,
    });
  }

  async findMine(userId: string): Promise<InviteTokenDocument[]> {
    return this.inviteModel
      .find({ invitedBy: new Types.ObjectId(userId) })
      .sort({ expiresAt: -1 });
  }

  async listTrainers(): Promise<TrainerOption[]> {
    const trainers = await this.userModel
      .find({ role: 'trainer' })
      .select('firstName lastName');

    return trainers.map((t) => ({
      _id: t._id,
      name: `${t.firstName} ${t.lastName}`,
    }));
  }

  async revoke(id: string, userId: string): Promise<void> {
    const invite = await this.inviteModel.findOne({
      _id: new Types.ObjectId(id),
      invitedBy: new Types.ObjectId(userId),
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.usedAt !== null) {
      throw new BadRequestException('Cannot revoke a used invite');
    }

    await this.inviteModel.deleteOne({ _id: new Types.ObjectId(id) });
  }
}
