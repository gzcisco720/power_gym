import mongoose from 'mongoose';
import type { INutritionTemplate, IDayType } from '@/lib/db/models/nutrition-template.model';
import { NutritionTemplateModel } from '@/lib/db/models/nutrition-template.model';

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

export interface INutritionTemplateRepository {
  findByCreator(createdBy: string): Promise<INutritionTemplate[]>;
  findById(id: string): Promise<INutritionTemplate | null>;
  create(data: CreateNutritionTemplateData): Promise<INutritionTemplate>;
  update(id: string, data: UpdateNutritionTemplateData): Promise<INutritionTemplate | null>;
  deleteById(id: string, createdBy: string): Promise<boolean>;
}

export class MongoNutritionTemplateRepository implements INutritionTemplateRepository {
  async findByCreator(createdBy: string): Promise<INutritionTemplate[]> {
    return NutritionTemplateModel.find({ createdBy: new mongoose.Types.ObjectId(createdBy) });
  }

  async findById(id: string): Promise<INutritionTemplate | null> {
    return NutritionTemplateModel.findById(id);
  }

  async create(data: CreateNutritionTemplateData): Promise<INutritionTemplate> {
    const template = new NutritionTemplateModel({
      ...data,
      createdBy: new mongoose.Types.ObjectId(data.createdBy),
    });
    return template.save();
  }

  async update(id: string, data: UpdateNutritionTemplateData): Promise<INutritionTemplate | null> {
    return NutritionTemplateModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async deleteById(id: string, createdBy: string): Promise<boolean> {
    const result = await NutritionTemplateModel.findOneAndDelete({
      _id: id,
      createdBy: new mongoose.Types.ObjectId(createdBy),
    });
    return result !== null;
  }
}
