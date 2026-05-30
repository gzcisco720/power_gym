import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FOOD_MODEL, FoodSchema } from '../database/models/food.model';
import { FoodRepository } from '../repositories/food.repository';
import { FoodsController } from './foods.controller';
import { FoodsService } from './foods.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FOOD_MODEL, schema: FoodSchema }]),
  ],
  controllers: [FoodsController],
  providers: [FoodsService, FoodRepository],
})
export class FoodsModule {}
