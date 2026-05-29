import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { PersonalBestRepository } from '../repositories/personal-best.repository';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class ProgressService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly personalBestRepo: PersonalBestRepository,
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

    const pbs = await this.personalBestRepo.findByMemberSorted(memberId);

    const oneRepMaxTrend = pbs.map((pb) => ({
      exerciseName: pb.exerciseName,
      estimatedOneRM: pb.estimatedOneRM,
      achievedAt: pb.achievedAt,
    }));

    return { oneRepMaxTrend };
  }
}
