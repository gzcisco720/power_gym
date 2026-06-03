import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MemberInjury,
  MemberInjuryDocument,
} from '../../common/models/member-injury.model';
import {
  MemberMedication,
  MemberMedicationDocument,
} from '../../common/models/member-medication.model';
import {
  MemberMedicalHistory,
  MemberMedicalHistoryDocument,
} from '../../common/models/member-medical-history.model';
import { CreateInjuryDto } from './dto/create-injury.dto';
import { UpdateInjuryDto } from './dto/update-injury.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';

type MedicalHistoryDefault = {
  memberId: string;
  chronicConditions: string[];
  surgeries: null;
  allergies: null;
  familyHistory: null;
  currentDoctor: null;
  emergencyContact: null;
  pregnancyStatus: null;
};

@Injectable()
export class HealthService {
  constructor(
    @InjectModel(MemberInjury.name)
    private readonly injuryModel: Model<MemberInjuryDocument>,
    @InjectModel(MemberMedication.name)
    private readonly medicationModel: Model<MemberMedicationDocument>,
    @InjectModel(MemberMedicalHistory.name)
    private readonly medicalHistoryModel: Model<MemberMedicalHistoryDocument>,
  ) {}

  // ─── Injuries ───────────────────────────────────────────────────────────────

  async findInjuries(memberId: string): Promise<MemberInjuryDocument[]> {
    return this.injuryModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ recordedAt: -1 });
  }

  async createInjury(
    dto: CreateInjuryDto,
    memberId: string,
  ): Promise<MemberInjuryDocument> {
    return this.injuryModel.create({
      ...dto,
      memberId: new Types.ObjectId(memberId),
      status: 'active',
      createdByRole: 'member',
    });
  }

  async updateInjury(
    id: string,
    dto: UpdateInjuryDto,
    memberId: string,
  ): Promise<MemberInjuryDocument> {
    const update: UpdateInjuryDto & { resolvedAt?: Date } = { ...dto };
    if (dto.status === 'resolved' && !dto.resolvedAt) {
      update.resolvedAt = new Date();
    }

    const updated = await this.injuryModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        memberId: new Types.ObjectId(memberId),
      },
      update,
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Injury not found');
    }

    return updated;
  }

  async deleteInjury(id: string, memberId: string): Promise<void> {
    const injury = await this.injuryModel.findOne({
      _id: new Types.ObjectId(id),
      memberId: new Types.ObjectId(memberId),
    });

    if (!injury) {
      throw new NotFoundException('Injury not found');
    }

    if (injury.createdByRole === 'trainer') {
      throw new ForbiddenException(
        'Cannot delete an injury created by a trainer',
      );
    }

    await this.injuryModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      memberId: new Types.ObjectId(memberId),
    });
  }

  // ─── Medications ─────────────────────────────────────────────────────────────

  async findMedications(memberId: string): Promise<MemberMedicationDocument[]> {
    return this.medicationModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ createdAt: -1 });
  }

  async createMedication(
    dto: CreateMedicationDto,
    memberId: string,
  ): Promise<MemberMedicationDocument> {
    return this.medicationModel.create({
      ...dto,
      memberId: new Types.ObjectId(memberId),
      status: 'active',
    });
  }

  async updateMedication(
    id: string,
    dto: UpdateMedicationDto,
    memberId: string,
  ): Promise<MemberMedicationDocument> {
    const updated = await this.medicationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        memberId: new Types.ObjectId(memberId),
      },
      dto,
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Medication not found');
    }

    return updated;
  }

  async deleteMedication(id: string, memberId: string): Promise<void> {
    const deleted = await this.medicationModel.findOneAndDelete({
      _id: new Types.ObjectId(id),
      memberId: new Types.ObjectId(memberId),
    });

    if (!deleted) {
      throw new NotFoundException('Medication not found');
    }
  }

  // ─── Medical History ─────────────────────────────────────────────────────────

  async getMedicalHistory(
    memberId: string,
  ): Promise<MemberMedicalHistoryDocument | MedicalHistoryDefault> {
    const record = await this.medicalHistoryModel.findOne({
      memberId: new Types.ObjectId(memberId),
    });

    if (!record) {
      return {
        memberId,
        chronicConditions: [],
        surgeries: null,
        allergies: null,
        familyHistory: null,
        currentDoctor: null,
        emergencyContact: null,
        pregnancyStatus: null,
      };
    }

    return record;
  }

  async saveMedicalHistory(
    dto: UpdateMedicalHistoryDto,
    memberId: string,
  ): Promise<MemberMedicalHistoryDocument> {
    const updated = await this.medicalHistoryModel.findOneAndUpdate(
      { memberId: new Types.ObjectId(memberId) },
      { $set: { ...dto, memberId: new Types.ObjectId(memberId) } },
      { upsert: true, new: true },
    );

    return updated;
  }
}
