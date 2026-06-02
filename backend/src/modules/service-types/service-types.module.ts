import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceTypesController } from './service-types.controller';
import { ServiceTypesService } from './service-types.service';
import {
  ServiceType,
  ServiceTypeSchema,
} from '../../common/models/service-type.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceType.name, schema: ServiceTypeSchema },
    ]),
  ],
  controllers: [ServiceTypesController],
  providers: [ServiceTypesService],
})
export class ServiceTypesModule {}
