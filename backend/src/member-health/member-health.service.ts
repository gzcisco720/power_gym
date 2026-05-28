import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { UserRepository } from '../repositories/user.repository';
import { MemberInjuryRepository } from '../repositories/member-injury.repository';
import { MemberMedicalHistoryRepository } from '../repositories/member-medical-history.repository';
import { MemberMedicationRepository } from '../repositories/member-medication.repository';
import { IMemberInjury } from '../database/models/member-injury.model';
import { IMemberMedicalHistory } from '../database/models/member-medical-history.model';
import { IMemberMedication } from '../database/models/member-medication.model';
import { CreateInjuryDto } from './dto/create-injury.dto';
import { UpdateMedicalHistoryDto } from './dto/update-medical-history.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { getDrugWarning } from './drug-warnings';

@Injectable()
export class MemberHealthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly injuryRepo: MemberInjuryRepository,
    private readonly medicalHistoryRepo: MemberMedicalHistoryRepository,
    private readonly medicationRepo: MemberMedicationRepository,
  ) {}

  private async assertCanAccessMember(
    caller: AuthUser,
    memberId: string,
  ): Promise<void> {
    if (caller.role === 'owner') return;
    if (caller.role === 'member') {
      if (caller.userId !== memberId) {
        throw new ForbiddenException('Access denied');
      }
      return;
    }
    // trainer
    const member = await this.userRepo.findById(memberId);
    if (!member || member.trainerId?.toString() !== caller.userId) {
      throw new NotFoundException('Member not found');
    }
  }

  private async assertTrainerOwnsMember(
    caller: AuthUser,
    memberId: string,
  ): Promise<void> {
    if (caller.role === 'owner') return;
    const member = await this.userRepo.findById(memberId);
    if (!member || member.trainerId?.toString() !== caller.userId) {
      throw new NotFoundException('Member not found');
    }
  }

  // ── Injuries ──────────────────────────────────────────────

  async createInjury(
    caller: AuthUser,
    memberId: string,
    dto: CreateInjuryDto,
  ): Promise<IMemberInjury> {
    await this.assertTrainerOwnsMember(caller, memberId);
    return this.injuryRepo.create({
      memberId,
      title: dto.title,
      status: dto.status,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : undefined,
      trainerNotes: dto.trainerNotes,
      memberNotes: dto.memberNotes,
      affectedMovements: dto.affectedMovements,
      injuryType: dto.injuryType,
      bodyPart: dto.bodyPart,
      bodySide: dto.bodySide,
      painAtRest: dto.painAtRest,
      painDuringExercise: dto.painDuringExercise,
      mechanism: dto.mechanism,
      aggravatingFactors: dto.aggravatingFactors,
      relievingFactors: dto.relievingFactors,
      seenDoctor: dto.seenDoctor,
      doctorRestrictions: dto.doctorRestrictions,
      rehabilitationStatus: dto.rehabilitationStatus,
      resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : undefined,
      createdByRole: dto.createdByRole ?? 'trainer',
    });
  }

  async listInjuries(
    caller: AuthUser,
    memberId: string,
  ): Promise<IMemberInjury[]> {
    await this.assertCanAccessMember(caller, memberId);
    return this.injuryRepo.findByMember(memberId);
  }

  // ── Medical History ───────────────────────────────────────

  async getMedicalHistory(
    caller: AuthUser,
    memberId: string,
  ): Promise<IMemberMedicalHistory | null> {
    await this.assertCanAccessMember(caller, memberId);
    return this.medicalHistoryRepo.findByMember(memberId);
  }

  async upsertMedicalHistory(
    caller: AuthUser,
    memberId: string,
    dto: UpdateMedicalHistoryDto,
  ): Promise<IMemberMedicalHistory> {
    await this.assertTrainerOwnsMember(caller, memberId);
    return this.medicalHistoryRepo.upsert(memberId, dto);
  }

  // ── Medications ───────────────────────────────────────────

  async createMedication(
    caller: AuthUser,
    memberId: string,
    dto: CreateMedicationDto,
  ): Promise<{ medication: IMemberMedication; warnings: string[] }> {
    await this.assertTrainerOwnsMember(caller, memberId);
    const medication = await this.medicationRepo.create({
      memberId,
      name: dto.name,
      purpose: dto.purpose,
      duration: dto.duration,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      notes: dto.notes,
    });

    const warning = getDrugWarning(dto.name);
    const warnings = warning ? [warning] : [];

    return { medication, warnings };
  }

  async listMedications(
    caller: AuthUser,
    memberId: string,
  ): Promise<IMemberMedication[]> {
    await this.assertCanAccessMember(caller, memberId);
    return this.medicationRepo.findByMember(memberId);
  }
}
