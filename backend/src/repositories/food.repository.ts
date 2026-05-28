import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IFood,
  IFoodMacros,
  IFoodServing,
  FOOD_MODEL,
} from '../database/models/food.model';

export interface CreateFoodData {
  createdBy: string;
  name: string;
  brand: string | null;
  macrosPer100g: IFoodMacros;
  servings: IFoodServing[];
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class FoodRepository {
  constructor(
    @InjectModel(FOOD_MODEL)
    private readonly model: Model<IFood>,
  ) {}

  async findById(id: string): Promise<IFood | null> {
    return this.model.findById(id);
  }

  async findVisibleTo(createdBy: string, q?: string): Promise<IFood[]> {
    const filter: Record<string, unknown> = {
      createdBy: new Types.ObjectId(createdBy),
    };
    if (q && q.trim()) {
      filter.name = { $regex: escapeRegex(q.trim()), $options: 'i' };
    }
    return this.model.find(filter).sort({ name: 1 }).limit(100);
  }

  async create(data: CreateFoodData): Promise<IFood> {
    const doc = new this.model({
      ...data,
      createdBy: new Types.ObjectId(data.createdBy),
    });
    return doc.save();
  }

  async deleteById(id: string, createdBy: string): Promise<boolean> {
    const result = await this.model.findOneAndDelete({
      _id: id,
      createdBy: new Types.ObjectId(createdBy),
    });
    return result !== null;
  }
}
