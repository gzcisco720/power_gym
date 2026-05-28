import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { UserRepository } from '../repositories/user.repository';
import {
  IPersonalBest,
  PERSONAL_BEST_MODEL,
} from '../database/models/personal-best.model';

@Injectable()
export class ProgressService {
  constructor(
    private readonly userRepo: UserRepository,
    @InjectModel(PERSONAL_BEST_MODEL)
    private readonly personalBestModel: Model<IPersonalBest>,
  ) {}

  async getMemberProgress(
    caller: AuthUser,
    memberId: string,
  ): Promise<{
    oneRepMaxTrend: {
      exerciseName: string;
      estimatedOneRM: number;
      achievedAt: Date;
    }[];
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

    const pbs = await this.personalBestModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ achievedAt: 1 });

    const oneRepMaxTrend = pbs.map((pb) => ({
      exerciseName: pb.exerciseName,
      estimatedOneRM: pb.estimatedOneRM,
      achievedAt: pb.achievedAt,
    }));

    return { oneRepMaxTrend };
  }
}
