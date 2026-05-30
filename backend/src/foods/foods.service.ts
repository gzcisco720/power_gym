import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FoodRepository } from '../repositories/food.repository';
import type {
  IFood,
  IFoodMacros,
  IFoodServing,
} from '../database/models/food.model';

export interface CreateFoodDto {
  name: string;
  brand?: string | null;
  macrosPer100g: IFoodMacros;
  servings: IFoodServing[];
}

export interface UpdateFoodDto {
  name?: string;
  brand?: string | null;
  macrosPer100g?: IFoodMacros;
  servings?: IFoodServing[];
}

@Injectable()
export class FoodsService {
  constructor(private readonly repo: FoodRepository) {}

  async list(userId: string, q?: string): Promise<IFood[]> {
    return this.repo.findVisibleTo(userId, q);
  }

  async create(dto: CreateFoodDto, userId: string): Promise<IFood> {
    return this.repo.create({
      name: dto.name,
      brand: dto.brand ?? null,
      macrosPer100g: dto.macrosPer100g,
      servings: dto.servings,
      createdBy: userId,
    });
  }

  async findOne(id: string, userId: string): Promise<IFood> {
    const food = await this.repo.findById(id);
    if (!food) throw new NotFoundException('Food not found');
    if (!food.createdBy.equals(userId)) throw new ForbiddenException();
    return food;
  }

  async update(id: string, dto: UpdateFoodDto, userId: string): Promise<IFood> {
    const food = await this.repo.findById(id);
    if (!food) throw new NotFoundException('Food not found');
    if (!food.createdBy.equals(userId)) throw new ForbiddenException();
    const updated = await this.repo.update(id, dto);
    return updated!;
  }

  async remove(id: string, userId: string): Promise<void> {
    const food = await this.repo.findById(id);
    if (!food) throw new NotFoundException('Food not found');
    if (!food.createdBy.equals(userId)) throw new ForbiddenException();
    await this.repo.deleteById(id, userId);
  }
}
