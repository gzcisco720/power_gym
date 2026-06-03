import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../common/models/user.model';
import {
  TrainerListItem,
  TrainerDetailResponse,
  TrainerMember,
} from './dto/trainer-response.types';

@Injectable()
export class TrainersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<TrainerListItem[]> {
    const trainers = await this.userModel.find({ role: 'trainer' });

    const results: TrainerListItem[] = await Promise.all(
      trainers.map(async (trainer) => {
        const members = await this.userModel.find({
          role: 'member',
          trainerId: trainer._id,
        });
        return {
          id: trainer._id.toString(),
          name: `${trainer.firstName} ${trainer.lastName}`,
          email: trainer.email,
          memberCount: members.length,
        };
      }),
    );

    return results;
  }

  async findOne(id: string): Promise<TrainerDetailResponse> {
    const trainer = await this.userModel
      .findById(id)
      .lean<User & { _id: Types.ObjectId; createdAt: Date }>();

    if (!trainer || trainer.role !== 'trainer') {
      throw new NotFoundException('Trainer not found');
    }

    const members = await this.userModel.find({
      role: 'member',
      trainerId: trainer._id,
    });

    const trainerMembers: TrainerMember[] = members.map((m) => ({
      id: m._id.toString(),
      name: `${m.firstName} ${m.lastName}`,
      email: m.email,
    }));

    const createdAt = trainer.createdAt;

    return {
      id: trainer._id.toString(),
      name: `${trainer.firstName} ${trainer.lastName}`,
      email: trainer.email,
      memberCount: members.length,
      joinDate: createdAt.toISOString(),
      members: trainerMembers,
    };
  }
}
