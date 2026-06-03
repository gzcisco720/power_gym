import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PlanTemplate,
  PlanTemplateDocument,
} from '../../common/models/plan-template.model';
import { CreatePlanTemplateDto } from './dto/create-plan-template.dto';
import { UpdatePlanTemplateDto } from './dto/update-plan-template.dto';
import { PlanDayDto } from './dto/plan-day.dto';

function mapDays(days: PlanDayDto[]) {
  return days.map((day) => ({
    dayNumber: day.dayNumber,
    name: day.name,
    exercises: day.exercises.map((ex) => ({
      groupId: ex.groupId,
      isSuperset: ex.isSuperset,
      exerciseId: new Types.ObjectId(ex.exerciseId),
      exerciseName: ex.exerciseName,
      imageUrl: ex.imageUrl ?? null,
      isBodyweight: ex.isBodyweight,
      sets: ex.sets,
      repsMin: ex.repsMin,
      repsMax: ex.repsMax,
      restSeconds: ex.restSeconds ?? null,
    })),
  }));
}

@Injectable()
export class PlanTemplatesService {
  constructor(
    @InjectModel(PlanTemplate.name)
    private readonly planTemplateModel: Model<PlanTemplateDocument>,
  ) {}

  async findOwn(userId: string): Promise<PlanTemplateDocument[]> {
    return this.planTemplateModel.find({
      createdBy: new Types.ObjectId(userId),
    });
  }

  async create(
    dto: CreatePlanTemplateDto,
    userId: string,
  ): Promise<PlanTemplateDocument> {
    return this.planTemplateModel.create({
      name: dto.name,
      description: dto.description ?? null,
      days: mapDays(dto.days),
      createdBy: new Types.ObjectId(userId),
    });
  }

  async update(
    id: string,
    dto: UpdatePlanTemplateDto,
    userId: string,
  ): Promise<PlanTemplateDocument> {
    const updated = await this.planTemplateModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        createdBy: new Types.ObjectId(userId),
      },
      {
        $set: {
          name: dto.name,
          description: dto.description ?? null,
          days: mapDays(dto.days),
        },
      },
      { returnDocument: 'after' },
    );

    if (!updated) {
      throw new NotFoundException('Plan template not found');
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const doc = await this.planTemplateModel.findOne({
      _id: new Types.ObjectId(id),
      createdBy: new Types.ObjectId(userId),
    });

    if (!doc) {
      throw new NotFoundException('Plan template not found');
    }

    await this.planTemplateModel.deleteOne({ _id: new Types.ObjectId(id) });
  }
}
