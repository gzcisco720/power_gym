import { Injectable } from '@nestjs/common';
import { BodyTestRepository } from '../repositories/body-test.repository';
import type { IBodyTest } from '../database/models/body-test.model';
import {
  calculateBodyFat,
  calculateComposition,
  type BodyFatInput,
} from '../common/body-test-formulas';

export interface CreateBodyTestInput {
  memberId: string;
  trainerId: string;
  date: Date;
  age: number;
  sex: 'male' | 'female';
  weight: number;
  protocol: '3site' | '7site' | '9site' | 'other';
  bodyFatPct?: number;
  tricep: number | null;
  chest: number | null;
  subscapular: number | null;
  abdominal: number | null;
  suprailiac: number | null;
  thigh: number | null;
  midaxillary: number | null;
  bicep: number | null;
  lumbar: number | null;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
}

function buildBodyFatInput(input: CreateBodyTestInput): BodyFatInput {
  if (input.protocol === 'other') {
    return { protocol: 'other', bodyFatPct: input.bodyFatPct ?? 0 };
  }

  const sex = input.sex;
  const age = input.age;

  if (input.protocol === '3site') {
    if (sex === 'male') {
      return {
        protocol: '3site',
        sex: 'male',
        age,
        chest: input.chest ?? 0,
        abdominal: input.abdominal ?? 0,
        thigh: input.thigh ?? 0,
      };
    }
    return {
      protocol: '3site',
      sex: 'female',
      age,
      tricep: input.tricep ?? 0,
      suprailiac: input.suprailiac ?? 0,
      thigh: input.thigh ?? 0,
    };
  }

  if (input.protocol === '7site') {
    return {
      protocol: '7site',
      sex,
      age,
      chest: input.chest ?? 0,
      midaxillary: input.midaxillary ?? 0,
      tricep: input.tricep ?? 0,
      subscapular: input.subscapular ?? 0,
      abdominal: input.abdominal ?? 0,
      suprailiac: input.suprailiac ?? 0,
      thigh: input.thigh ?? 0,
    };
  }

  return {
    protocol: '9site',
    sex,
    age,
    tricep: input.tricep ?? 0,
    chest: input.chest ?? 0,
    subscapular: input.subscapular ?? 0,
    abdominal: input.abdominal ?? 0,
    suprailiac: input.suprailiac ?? 0,
    thigh: input.thigh ?? 0,
    midaxillary: input.midaxillary ?? 0,
    bicep: input.bicep ?? 0,
    lumbar: input.lumbar ?? 0,
  };
}

@Injectable()
export class BodyTestsService {
  constructor(private readonly repo: BodyTestRepository) {}

  async create(input: CreateBodyTestInput): Promise<IBodyTest> {
    const bodyFatInput = buildBodyFatInput(input);
    const bodyFatPct = calculateBodyFat(bodyFatInput);
    const { fatMassKg, leanMassKg } = calculateComposition(
      input.weight,
      bodyFatPct,
    );

    return this.repo.create({
      memberId: input.memberId,
      trainerId: input.trainerId,
      date: input.date,
      age: input.age,
      sex: input.sex,
      weight: input.weight,
      protocol: input.protocol,
      tricep: input.tricep,
      chest: input.chest,
      subscapular: input.subscapular,
      abdominal: input.abdominal,
      suprailiac: input.suprailiac,
      thigh: input.thigh,
      midaxillary: input.midaxillary,
      bicep: input.bicep,
      lumbar: input.lumbar,
      bodyFatPct,
      fatMassKg,
      leanMassKg,
      targetWeight: input.targetWeight,
      targetBodyFatPct: input.targetBodyFatPct,
    });
  }

  async list(memberId: string): Promise<IBodyTest[]> {
    return this.repo.findByMember(memberId);
  }

  async exportCsv(memberId: string): Promise<string> {
    const tests = await this.repo.findByMember(memberId);
    const rows = [
      'Date,Weight (kg),Body Fat (%),Fat Mass (kg),Lean Mass (kg),Protocol',
      ...tests.map((t) =>
        [
          new Date(t.date).toISOString().split('T')[0],
          t.weight.toFixed(1),
          t.bodyFatPct.toFixed(1),
          t.fatMassKg.toFixed(1),
          t.leanMassKg.toFixed(1),
          t.protocol,
        ].join(','),
      ),
    ];
    return rows.join('\n');
  }
}
