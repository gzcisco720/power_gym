import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IPlanTemplate,
  IPlanDay,
  PLAN_TEMPLATE_MODEL,
} from '../database/models/plan-template.model';

export interface CreatePlanTemplateData {
  name: string;
  description: string | null;
  createdBy: string;
  days: IPlanDay[];
}

export interface UpdatePlanTemplateData {
  name?: string;
  description?: string | null;
  days?: IPlanDay[];
}

@Injectable()
export class PlanTemplateRepository {
  constructor(
    @InjectModel(PLAN_TEMPLATE_MODEL)
    private readonly model: Model<IPlanTemplate>,
  ) {}

  async findByCreator(createdBy: string): Promise<IPlanTemplate[]> {
    return this.model.find({ createdBy: new Types.ObjectId(createdBy) });
  }

  async findById(id: string): Promise<IPlanTemplate | null> {
    return this.model.findById(id);
  }

  async create(data: CreatePlanTemplateData): Promise<IPlanTemplate> {
    const doc = new this.model({
      ...data,
      createdBy: new Types.ObjectId(data.createdBy),
    });
    return doc.save();
  }

  async update(
    id: string,
    data: UpdatePlanTemplateData,
  ): Promise<IPlanTemplate | null> {
    return this.model.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string, createdBy: string): Promise<boolean> {
    const result = await this.model.findOneAndDelete({
      _id: id,
      createdBy: new Types.ObjectId(createdBy),
    });
    return result !== null;
  }
}
