import mongoose from 'mongoose';
import { FoodModel, type IFood, type IFoodMacros, type IFoodServing } from '@/lib/db/models/food.model';

export interface CreateFoodData {
  createdBy: mongoose.Types.ObjectId;
  name: string;
  brand?: string | null;
  macrosPer100g: IFoodMacros;
  servings: IFoodServing[];
}

export interface UpdateFoodData {
  name?: string;
  brand?: string | null;
  macrosPer100g?: IFoodMacros;
  servings?: IFoodServing[];
}

export interface IFoodRepository {
  findById(id: mongoose.Types.ObjectId): Promise<IFood | null>;
  findVisibleTo(creatorId: mongoose.Types.ObjectId, q?: string): Promise<IFood[]>;
  create(data: CreateFoodData): Promise<IFood>;
  update(id: mongoose.Types.ObjectId, data: UpdateFoodData): Promise<IFood | null>;
  delete(id: mongoose.Types.ObjectId): Promise<boolean>;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class MongoFoodRepository implements IFoodRepository {
  async findById(id: mongoose.Types.ObjectId): Promise<IFood | null> {
    return FoodModel.findById(id);
  }

  async findVisibleTo(creatorId: mongoose.Types.ObjectId, q?: string): Promise<IFood[]> {
    const filter: Record<string, unknown> = { createdBy: creatorId };
    if (q && q.trim()) {
      filter.name = { $regex: escapeRegex(q.trim()), $options: 'i' };
    }
    return FoodModel.find(filter).sort({ name: 1 }).limit(100);
  }

  async create(data: CreateFoodData): Promise<IFood> {
    const doc = new FoodModel({ ...data, brand: data.brand ?? null });
    return doc.save();
  }

  async update(id: mongoose.Types.ObjectId, data: UpdateFoodData): Promise<IFood | null> {
    return FoodModel.findByIdAndUpdate(id, data, { returnDocument: 'after' });
  }

  async delete(id: mongoose.Types.ObjectId): Promise<boolean> {
    const r = await FoodModel.deleteOne({ _id: id });
    return r.deletedCount === 1;
  }
}
