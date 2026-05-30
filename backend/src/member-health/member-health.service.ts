import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MemberInjuryRepository } from '../repositories/member-injury.repository';
import type {
  CreateInjuryData,
  UpdateInjuryData,
} from '../repositories/member-injury.repository';
import { MemberMedicalHistoryRepository } from '../repositories/member-medical-history.repository';
import type { UpsertMedicalHistoryData } from '../repositories/member-medical-history.repository';
import { MemberMedicationRepository } from '../repositories/member-medication.repository';
import type {
  CreateMedicationData,
  UpdateMedicationData,
} from '../repositories/member-medication.repository';
import { UserRepository } from '../repositories/user.repository';
import type { IMemberInjury } from '../database/models/member-injury.model';
import type { IMemberMedicalHistory } from '../database/models/member-medical-history.model';
import type { IMemberMedication } from '../database/models/member-medication.model';
import type { UserRole } from '../common/interfaces/auth-user.interface';

@Injectable()
export class MemberHealthService {
  constructor(
    private readonly injuryRepo: MemberInjuryRepository,
    private readonly medHistRepo: MemberMedicalHistoryRepository,
    private readonly medRepo: MemberMedicationRepository,
    private readonly userRepo: UserRepository,
  ) {}

  private async assertAccess(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    if (requesterRole === 'owner') return;
    if (requesterRole === 'member') {
      if (requesterId !== memberId) throw new ForbiddenException();
      return;
    }
    const member = await this.userRepo.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');
    if (member.trainerId?.toString() !== requesterId) {
      throw new ForbiddenException();
    }
  }

  // --- Injuries ---

  async listInjuries(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberInjury[]> {
    await this.assertAccess(memberId, requesterId, requesterRole);
    return this.injuryRepo.findByMember(memberId);
  }

  async addInjury(
    memberId: string,
    data: Omit<CreateInjuryData, 'memberId'>,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberInjury> {
    await this.assertAccess(memberId, requesterId, requesterRole);
    return this.injuryRepo.create({ ...data, memberId });
  }

  async updateInjury(
    memberId: string,
    injuryId: string,
    data: UpdateInjuryData,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberInjury> {
    await this.assertAccess(memberId, requesterId, requesterRole);
    const updated = await this.injuryRepo.update(injuryId, data);
    if (!updated) throw new NotFoundException('Injury not found');
    return updated;
  }

  async deleteInjury(
    memberId: string,
    injuryId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    await this.assertAccess(memberId, requesterId, requesterRole);
    await this.injuryRepo.deleteById(injuryId);
  }

  // --- Medical History ---

  async getMedicalHistory(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberMedicalHistory | null> {
    await this.assertAccess(memberId, requesterId, requesterRole);
    return this.medHistRepo.findByMember(memberId);
  }

  async updateMedicalHistory(
    memberId: string,
    data: UpsertMedicalHistoryData,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberMedicalHistory> {
    await this.assertAccess(memberId, requesterId, requesterRole);
    return this.medHistRepo.upsert(memberId, data);
  }

  // --- Medications ---

  async listMedications(
    memberId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberMedication[]> {
    await this.assertAccess(memberId, requesterId, requesterRole);
    return this.medRepo.findByMember(memberId);
  }

  async addMedication(
    memberId: string,
    data: Omit<CreateMedicationData, 'memberId'>,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberMedication> {
    // v1 only allows member to self-submit medications
    if (requesterRole !== 'member') throw new ForbiddenException();
    if (requesterId !== memberId) throw new ForbiddenException();
    return this.medRepo.create({ ...data, memberId });
  }

  async updateMedication(
    memberId: string,
    medicationId: string,
    data: UpdateMedicationData,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<IMemberMedication> {
    // v1 only allows member to update own medications
    if (requesterRole !== 'member') throw new ForbiddenException();
    if (requesterId !== memberId) throw new ForbiddenException();
    const med = await this.medRepo.findById(medicationId);
    if (!med) throw new NotFoundException('Medication not found');
    if (med.memberId.toString() !== requesterId) throw new ForbiddenException();
    const updated = await this.medRepo.update(medicationId, data);
    if (!updated) throw new NotFoundException('Medication not found');
    return updated;
  }

  async deleteMedication(
    memberId: string,
    medicationId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<void> {
    // v1 only allows member to delete own medications
    if (requesterRole !== 'member') throw new ForbiddenException();
    if (requesterId !== memberId) throw new ForbiddenException();
    const med = await this.medRepo.findById(medicationId);
    if (!med) throw new NotFoundException('Medication not found');
    if (med.memberId.toString() !== requesterId) throw new ForbiddenException();
    await this.medRepo.deleteById(medicationId);
  }
}
