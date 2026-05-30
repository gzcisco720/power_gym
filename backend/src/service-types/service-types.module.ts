import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SERVICE_TYPE_MODEL,
  ServiceTypeSchema,
} from '../database/models/service-type.model';
import { ServiceTypeRepository } from '../repositories/service-type.repository';
import { ServiceTypesService } from './service-types.service';
import { ServiceTypesController } from './service-types.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SERVICE_TYPE_MODEL, schema: ServiceTypeSchema },
    ]),
  ],
  controllers: [ServiceTypesController],
  providers: [ServiceTypesService, ServiceTypeRepository],
  exports: [ServiceTypesService, ServiceTypeRepository],
})
export class ServiceTypesModule {}
