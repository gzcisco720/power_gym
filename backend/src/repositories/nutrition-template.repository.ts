import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  INutritionTemplate,
  IDayType,
  NUTRITION_TEMPLATE_MODEL,
} from '../database/models/nutrition-template.model';

export interface CreateNutritionTemplateData {
  name: string;
  description: string | null;
  createdBy: string;
  dayTypes: IDayType[];
}

export interface UpdateNutritionTemplateData {
  name?: string;
  description?: string | null;
  dayTypes?: IDayType[];
}

@Injectable()
export class NutritionTemplateRepository {
  constructor(
    @InjectModel(NUTRITION_TEMPLATE_MODEL)
    private readonly model: Model<INutritionTemplate>,
  ) {}

  async findByCreator(createdBy: string): Promise<INutritionTemplate[]> {
    return this.model.find({ createdBy: new Types.ObjectId(createdBy) });
  }

  async findById(id: string): Promise<INutritionTemplate | null> {
    return this.model.findById(id);
  }

  async create(data: CreateNutritionTemplateData): Promise<INutritionTemplate> {
    const doc = new this.model({
      ...data,
      createdBy: new Types.ObjectId(data.createdBy),
    });
    return doc.save();
  }

  async update(
    id: string,
    data: UpdateNutritionTemplateData,
  ): Promise<INutritionTemplate | null> {
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
