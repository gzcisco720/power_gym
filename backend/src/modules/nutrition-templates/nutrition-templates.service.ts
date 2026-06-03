import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NutritionTemplate,
  NutritionTemplateDocument,
} from './nutrition-template.model';
import { CreateNutritionTemplateDto } from './dto/create-nutrition-template.dto';
import { UpdateNutritionTemplateDto } from './dto/update-nutrition-template.dto';

@Injectable()
export class NutritionTemplatesService {
  constructor(
    @InjectModel(NutritionTemplate.name)
    private readonly nutritionTemplateModel: Model<NutritionTemplateDocument>,
  ) {}

  async findOwn(userId: string): Promise<NutritionTemplateDocument[]> {
    return this.nutritionTemplateModel
      .find({ createdBy: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
  }

  async create(
    dto: CreateNutritionTemplateDto,
    userId: string,
  ): Promise<NutritionTemplateDocument> {
    return this.nutritionTemplateModel.create({
      name: dto.name.trim(),
      dayTypes: dto.dayTypes,
      createdBy: new Types.ObjectId(userId),
    });
  }

  async update(
    id: string,
    dto: UpdateNutritionTemplateDto,
    userId: string,
  ): Promise<NutritionTemplateDocument> {
    const updated = await this.nutritionTemplateModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        createdBy: new Types.ObjectId(userId),
      },
      { $set: { name: dto.name, dayTypes: dto.dayTypes } },
      { returnDocument: 'after' },
    );

    if (!updated) {
      throw new NotFoundException('Nutrition template not found');
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const doc = await this.nutritionTemplateModel.findOne({
      _id: new Types.ObjectId(id),
      createdBy: new Types.ObjectId(userId),
    });

    if (!doc) {
      throw new NotFoundException('Nutrition template not found');
    }

    await this.nutritionTemplateModel.deleteOne({
      _id: new Types.ObjectId(id),
    });
  }
}
