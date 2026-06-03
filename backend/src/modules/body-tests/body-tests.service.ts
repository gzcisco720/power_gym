import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BodyTest,
  BodyTestDocument,
} from '../../common/models/body-test.model';
import { User, UserDocument } from '../../common/models/user.model';
import { CreateBodyTestDto } from './dto/create-body-test.dto';
import {
  calculateBodyFat,
  calculateComposition,
  BodyFatInput,
} from './body-test-formulas';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function buildFormulaInput(dto: CreateBodyTestDto): BodyFatInput {
  if (dto.protocol === 'other') {
    return { protocol: 'other', bodyFatPct: dto.bodyFatPct! };
  }

  if (dto.protocol === '3site') {
    if (dto.sex === 'male') {
      return {
        protocol: '3site',
        sex: 'male',
        age: dto.age,
        chest: dto.chest!,
        abdominal: dto.abdominal!,
        thigh: dto.thigh!,
      };
    } else {
      return {
        protocol: '3site',
        sex: 'female',
        age: dto.age,
        tricep: dto.tricep!,
        suprailiac: dto.suprailiac!,
        thigh: dto.thigh!,
      };
    }
  }

  if (dto.protocol === '7site') {
    return {
      protocol: '7site',
      sex: dto.sex,
      age: dto.age,
      chest: dto.chest!,
      midaxillary: dto.midaxillary!,
      tricep: dto.tricep!,
      subscapular: dto.subscapular!,
      abdominal: dto.abdominal!,
      suprailiac: dto.suprailiac!,
      thigh: dto.thigh!,
    };
  }

  // 9site
  return {
    protocol: '9site',
    sex: dto.sex,
    age: dto.age,
    tricep: dto.tricep!,
    chest: dto.chest!,
    subscapular: dto.subscapular!,
    abdominal: dto.abdominal!,
    suprailiac: dto.suprailiac!,
    thigh: dto.thigh!,
    midaxillary: dto.midaxillary!,
    bicep: dto.bicep!,
    lumbar: dto.lumbar!,
  };
}

@Injectable()
export class BodyTestsService {
  constructor(
    @InjectModel(BodyTest.name)
    private readonly bodyTestModel: Model<BodyTestDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByMember(memberId: string): Promise<BodyTestDocument[]> {
    return this.bodyTestModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ date: -1 });
  }

  async create(
    dto: CreateBodyTestDto,
    memberId: string,
  ): Promise<BodyTestDocument> {
    const user = await this.userModel.findById(memberId);
    if (!user) throw new NotFoundException('Member not found');

    const formulaInput = buildFormulaInput(dto);
    const rawBodyFatPct = calculateBodyFat(formulaInput);
    const bodyFatPct = clamp(rawBodyFatPct, 1, 60);
    const { fatMassKg, leanMassKg } = calculateComposition(
      dto.weight,
      bodyFatPct,
    );

    return this.bodyTestModel.create({
      date: new Date(dto.date),
      age: dto.age,
      sex: dto.sex,
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
      targetWeight: dto.targetWeight ?? null,
      targetBodyFatPct: dto.targetBodyFatPct ?? null,
      memberId: new Types.ObjectId(memberId),
      trainerId: null,
      bodyFatPct,
      fatMassKg,
      leanMassKg,
    });
  }

  async remove(id: string, memberId: string): Promise<void> {
    const doc = await this.bodyTestModel.findById(id);
    if (!doc) throw new NotFoundException('Body test not found');

    if (doc.memberId.toString() !== memberId) {
      throw new NotFoundException('Body test not found');
    }

    await this.bodyTestModel.deleteOne({ _id: id });
  }
}
