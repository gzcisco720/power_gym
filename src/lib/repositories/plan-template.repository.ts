import mongoose from 'mongoose';
import type { IPlanTemplate, IPlanDay } from '@/lib/db/models/plan-template.model';
import { PlanTemplateModel } from '@/lib/db/models/plan-template.model';

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

export interface IPlanTemplateRepository {
  findByCreator(createdBy: string): Promise<IPlanTemplate[]>;
  findById(id: string): Promise<IPlanTemplate | null>;
  create(data: CreatePlanTemplateData): Promise<IPlanTemplate>;
  update(id: string, data: UpdatePlanTemplateData): Promise<IPlanTemplate | null>;
  deleteById(id: string, createdBy: string): Promise<boolean>;
  countByCreator(createdBy: string): Promise<number>;
}

export class MongoPlanTemplateRepository implements IPlanTemplateRepository {
  async findByCreator(createdBy: string): Promise<IPlanTemplate[]> {
    return PlanTemplateModel.find({ createdBy: new mongoose.Types.ObjectId(createdBy) });
  }

  async findById(id: string): Promise<IPlanTemplate | null> {
    return PlanTemplateModel.findById(id);
  }

  async create(data: CreatePlanTemplateData): Promise<IPlanTemplate> {
    const template = new PlanTemplateModel({
      ...data,
      createdBy: new mongoose.Types.ObjectId(data.createdBy),
    });
    return template.save();
  }

  async update(id: string, data: UpdatePlanTemplateData): Promise<IPlanTemplate | null> {
    return PlanTemplateModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string, createdBy: string): Promise<boolean> {
    const result = await PlanTemplateModel.findOneAndDelete({
      _id: id,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });
    return result !== null;
  }

  async countByCreator(createdBy: string): Promise<number> {
    return PlanTemplateModel.countDocuments({
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });
  }
}
