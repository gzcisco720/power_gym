import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import {
  Equipment,
  EquipmentDocument,
} from '../../common/models/equipment.model';
import {
  ConditionReport,
  ConditionReportDocument,
} from '../../common/models/condition-report.model';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { buildUploadSignature } from '../../common/upload/upload-signature';

type CloudinaryConfig = {
  provider: 'cloudinary';
  uploadUrl: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
  cloudName: string;
};

type LocalConfig = {
  provider: 'local';
  uploadUrl: string;
  folder: string;
};

export type UploadConfig = CloudinaryConfig | LocalConfig;

@Injectable()
export class EquipmentService {
  constructor(
    @InjectModel(Equipment.name)
    private readonly equipmentModel: Model<EquipmentDocument>,
    @InjectModel(ConditionReport.name)
    private readonly conditionReportModel: Model<ConditionReportDocument>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<EquipmentDocument[]> {
    return this.equipmentModel.find({}).sort({ createdAt: -1 });
  }

  async create(dto: CreateEquipmentDto): Promise<EquipmentDocument> {
    return this.equipmentModel.create({
      name: dto.name.trim(),
      status: dto.status ?? 'active',
      brand: dto.brand?.trim() ?? null,
      quantity: dto.quantity ?? 1,
      images: dto.images ?? [],
      note: dto.note?.trim() ?? null,
      trackCondition: dto.trackCondition ?? false,
      nextServiceDate: dto.nextServiceDate
        ? new Date(dto.nextServiceDate)
        : null,
    });
  }

  async update(
    id: string,
    dto: UpdateEquipmentDto,
  ): Promise<EquipmentDocument> {
    const updated = await this.equipmentModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Equipment not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.equipmentModel.findByIdAndDelete(id);
    await this.conditionReportModel.deleteMany({
      equipmentId: new Types.ObjectId(id),
    });
  }

  async findConditionReports(
    equipmentId: string,
  ): Promise<ConditionReportDocument[]> {
    const equipment = await this.equipmentModel.findById(equipmentId);
    if (!equipment) throw new NotFoundException('Equipment not found');
    return this.conditionReportModel
      .find({ equipmentId: new Types.ObjectId(equipmentId) })
      .sort({ reportedAt: -1 });
  }

  async createConditionReport(
    equipmentId: string,
    note: string,
  ): Promise<ConditionReportDocument> {
    const equipment = await this.equipmentModel.findById(equipmentId);
    if (!equipment) throw new NotFoundException('Equipment not found');
    return this.conditionReportModel.create({
      equipmentId: new Types.ObjectId(equipmentId),
      note: note.trim(),
    });
  }

  getUploadSignature(): UploadConfig {
    const folder = 'equipment';

    if (this.configService.get<string>('UPLOAD_PROVIDER') === 'local') {
      return { provider: 'local', uploadUrl: '/equipment/upload', folder };
    }

    const secret =
      this.configService.get<string>('CLOUDINARY_API_SECRET') ?? '';
    const cloudName =
      this.configService.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY') ?? '';
    const timestamp = Math.round(Date.now() / 1000);

    const sig = buildUploadSignature({ secret, cloudName, apiKey, timestamp });

    return {
      provider: 'cloudinary',
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      apiKey,
      signature: sig.signature,
      timestamp,
      folder,
      cloudName,
    };
  }
}
