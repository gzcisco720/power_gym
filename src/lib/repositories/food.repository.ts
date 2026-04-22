import mongoose from 'mongoose';
import type { IFood, IPer100g, IPerServing } from '@/lib/db/models/food.model';
import { FoodModel } from '@/lib/db/models/food.model';

export interface CreateFoodData {
  name: string;
  brand: string | null;
  createdBy: string | null;
  isGlobal: boolean;
  per100g: IPer100g | null;
  perServing: IPerServing | null;
}

export interface FindFoodsOptions {
  creatorId?: string | null;
}

export interface IFoodRepository {
  findAll(options: FindFoodsOptions): Promise<IFood[]>;
  create(data: CreateFoodData): Promise<IFood>;
}

export class MongoFoodRepository implements IFoodRepository {
  async findAll({ creatorId }: FindFoodsOptions = {}): Promise<IFood[]> {
    const query = creatorId
      ? { $or: [{ isGlobal: true }, { createdBy: new mongoose.Types.ObjectId(creatorId) }] }
      : { isGlobal: true };
    return FoodModel.find(query);
  }

  async create(data: CreateFoodData): Promise<IFood> {
    const food = new FoodModel({
      ...data,
      source: 'manual',
      externalId: null,
      createdBy: data.createdBy ? new mongoose.Types.ObjectId(data.createdBy) : null,
    });
    return food.save();
  }
}
