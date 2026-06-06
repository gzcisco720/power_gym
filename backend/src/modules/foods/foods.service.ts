import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Food, FoodDocument } from './food.model';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';

@Injectable()
export class FoodsService {
  constructor(
    @InjectModel(Food.name)
    private readonly foodModel: Model<FoodDocument>,
  ) {}

  async search(
    q: string,
    userId: string,
    limit: number,
  ): Promise<FoodDocument[]> {
    const visibilityCondition = {
      $or: [
        { isGlobal: true as const },
        { createdBy: new Types.ObjectId(userId) },
      ],
    };

    if (q) {
      const escaped = q.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return this.foodModel
        .find({
          ...visibilityCondition,
          name: { $regex: escaped, $options: 'i' },
        })
        .sort({ createdAt: -1 })
        .limit(limit);
    }

    return this.foodModel
      .find(visibilityCondition)
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async create(dto: CreateFoodDto, userId: string): Promise<FoodDocument> {
    return this.foodModel.create({
      name: dto.name,
      brand: dto.brand ?? null,
      macrosPer100g: dto.macrosPer100g,
      servings: dto.servings ?? [],
      isGlobal: false,
      createdBy: new Types.ObjectId(userId),
    });
  }

  async update(
    id: string,
    dto: UpdateFoodDto,
    userId: string,
  ): Promise<FoodDocument> {
    const food = await this.foodModel.findById(id);

    if (!food) {
      throw new NotFoundException('Food not found');
    }

    if (food.isGlobal || food.createdBy.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this food',
      );
    }

    return (await this.foodModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { returnDocument: 'after' },
    ))!;
  }

  async remove(id: string, userId: string): Promise<void> {
    const food = await this.foodModel.findById(id);

    if (!food) {
      throw new NotFoundException('Food not found');
    }

    if (food.isGlobal || food.createdBy.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this food',
      );
    }

    await this.foodModel.findByIdAndDelete(id);
  }
}
