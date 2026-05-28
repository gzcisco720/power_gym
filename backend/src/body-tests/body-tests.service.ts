import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { BodyTestRepository } from '../repositories/body-test.repository';
import { UserRepository } from '../repositories/user.repository';
import { IBodyTest } from '../database/models/body-test.model';
import { calculateBodyFat, calculateComposition } from './formulas';
import type { BodyFatInput } from './formulas';
import { CreateBodyTestDto } from './dto/create-body-test.dto';

function csvCell(value: string | number | null): string {
  const s = value === null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildBodyFatInput(dto: CreateBodyTestDto): BodyFatInput {
  if (dto.protocol === 'other') {
    return { protocol: 'other', bodyFatPct: dto.bodyFatPct ?? 0 };
  }

  const sex = dto.sex ?? 'male';
  const age = dto.age ?? 0;

  if (dto.protocol === '3site') {
    if (sex === 'male') {
      return {
        protocol: '3site',
        sex: 'male',
        age,
        chest: dto.chest ?? 0,
        abdominal: dto.abdominal ?? 0,
        thigh: dto.thigh ?? 0,
      };
    }
    return {
      protocol: '3site',
      sex: 'female',
      age,
      tricep: dto.tricep ?? 0,
      suprailiac: dto.suprailiac ?? 0,
      thigh: dto.thigh ?? 0,
    };
  }

  if (dto.protocol === '7site') {
    return {
      protocol: '7site',
      sex,
      age,
      chest: dto.chest ?? 0,
      midaxillary: dto.midaxillary ?? 0,
      tricep: dto.tricep ?? 0,
      subscapular: dto.subscapular ?? 0,
      abdominal: dto.abdominal ?? 0,
      suprailiac: dto.suprailiac ?? 0,
      thigh: dto.thigh ?? 0,
    };
  }

  // 9site
  return {
    protocol: '9site',
    sex,
    age,
    tricep: dto.tricep ?? 0,
    chest: dto.chest ?? 0,
    subscapular: dto.subscapular ?? 0,
    abdominal: dto.abdominal ?? 0,
    suprailiac: dto.suprailiac ?? 0,
    thigh: dto.thigh ?? 0,
    midaxillary: dto.midaxillary ?? 0,
    bicep: dto.bicep ?? 0,
    lumbar: dto.lumbar ?? 0,
  };
}

@Injectable()
export class BodyTestsService {
  constructor(
    private readonly bodyTestRepo: BodyTestRepository,
    private readonly userRepo: UserRepository,
  ) {}

  private async assertTrainerOwnsMember(
    caller: AuthUser,
    memberId: string,
  ): Promise<void> {
    if (caller.role === 'owner') return;
    if (caller.role === 'trainer') {
      const member = await this.userRepo.findById(memberId);
      if (!member || member.trainerId?.toString() !== caller.userId) {
        throw new NotFoundException('Member not found');
      }
    }
  }

  async createBodyTest(
    caller: AuthUser,
    memberId: string,
    dto: CreateBodyTestDto,
  ): Promise<IBodyTest> {
    await this.assertTrainerOwnsMember(caller, memberId);

    const bodyFatInput = buildBodyFatInput(dto);
    const bodyFatPct = calculateBodyFat(bodyFatInput);
    const { fatMassKg, leanMassKg } = calculateComposition(
      dto.weight,
      bodyFatPct,
    );

    return this.bodyTestRepo.create({
      memberId,
      trainerId: caller.userId,
      date: new Date(dto.date),
      age: dto.age ?? 0,
      sex: dto.sex ?? 'male',
      weight: dto.weight,
      protocol: dto.protocol,
      tricep: dto.tricep ?? null,
      chest: dto.chest ?? null,
      subscapular: dto.subscapular ?? null,
      abdominal: dto.abdominal ?? null,
      suprailiac: dto.suprailiac ?? null,
      thigh: dto.thigh ?? null,
      midaxillary: dto.midaxillary ?? null,
      bicep: dto.bicep ?? null,
      lumbar: dto.lumbar ?? null,
      bodyFatPct,
      leanMassKg,
      fatMassKg,
      targetWeight: dto.targetWeight ?? null,
      targetBodyFatPct: dto.targetBodyFatPct ?? null,
    });
  }

  async listBodyTests(
    caller: AuthUser,
    memberId: string,
  ): Promise<IBodyTest[]> {
    await this.assertTrainerOwnsMember(caller, memberId);
    return this.bodyTestRepo.findByMember(memberId);
  }

  async deleteBodyTest(
    caller: AuthUser,
    memberId: string,
    testId: string,
  ): Promise<void> {
    await this.assertTrainerOwnsMember(caller, memberId);
    let deleted: boolean;
    if (caller.role === 'owner') {
      deleted = await this.bodyTestRepo.deleteById(testId);
    } else {
      deleted = await this.bodyTestRepo.deleteByIdAndTrainer(
        testId,
        caller.userId,
      );
    }
    if (!deleted) {
      throw new NotFoundException('Body test not found');
    }
  }

  private buildBodyTestCsvRows(tests: IBodyTest[]): string[] {
    const rows = [
      'Date,Weight (kg),Body Fat (%),Fat Mass (kg),Lean Mass (kg),Protocol',
    ];
    for (const t of tests) {
      rows.push(
        [
          csvCell(new Date(t.date).toISOString().split('T')[0]),
          csvCell(t.weight.toFixed(1)),
          csvCell(t.bodyFatPct.toFixed(1)),
          csvCell(t.fatMassKg.toFixed(1)),
          csvCell(t.leanMassKg.toFixed(1)),
          csvCell(t.protocol),
        ].join(','),
      );
    }
    return rows;
  }

  async exportMeBodyTestsCsv(caller: AuthUser): Promise<string> {
    const tests = await this.bodyTestRepo.findByMember(caller.userId);
    return this.buildBodyTestCsvRows(tests).join('\n');
  }

  // Owner exporting a specific member's body tests as CSV
  async exportMemberBodyTestsCsv(
    caller: AuthUser,
    memberId: string,
  ): Promise<string> {
    await this.assertTrainerOwnsMember(caller, memberId);
    const tests = await this.bodyTestRepo.findByMember(memberId);
    return this.buildBodyTestCsvRows(tests).join('\n');
  }
}
