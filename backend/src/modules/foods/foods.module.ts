import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FoodsController } from './foods.controller';
import { FoodsService } from './foods.service';
import { Food, FoodSchema } from './food.model';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Food.name, schema: FoodSchema }]),
  ],
  controllers: [FoodsController],
  providers: [FoodsService],
})
export class FoodsModule {}
