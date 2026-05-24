import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';
import { MongoMemberMedicalHistoryRepository } from '@/lib/repositories/member-medical-history.repository';
import { InjuryClient } from './_components/injury-client';
import { MedicationsSection } from './_components/medications-section';
import { MedicalHistorySection } from './_components/medical-history-section';
import type { IMemberInjury } from '@/lib/db/models/member-injury.model';
import type { IMemberMedication } from '@/lib/db/models/member-medication.model';
import type { IMemberMedicalHistory } from '@/lib/db/models/member-medical-history.model';

export type SerializedInjury = {
  _id: string;
  title: string;
  status: 'active' | 'resolved';
  recordedAt: string;
  resolvedAt: string | null;
  trainerNotes: string | null;
  memberNotes: string | null;
  affectedMovements: string | null;
  injuryType: 'acute' | 'chronic' | 'post_surgery' | null;
  bodyPart: 'knee' | 'shoulder' | 'lower_back' | 'hip' | 'ankle' | 'wrist' | 'neck' | 'other' | null;
  bodySide: 'left' | 'right' | 'bilateral' | null;
  painAtRest: number | null;
  painDuringExercise: number | null;
  mechanism: string | null;
  aggravatingFactors: string | null;
  relievingFactors: string | null;
  doctorRestrictions: string | null;
  rehabilitationStatus: 'not_started' | 'in_progress' | 'cleared' | null;
  seenDoctor: boolean;
  createdByRole: 'trainer' | 'member';
};

export type SerializedMedication = {
  _id: string;
  name: string;
  purpose: string;
  duration: 'long_term' | 'short_term';
  startDate: string;
  endDate: string | null;
  notes: string | null;
  status: 'active' | 'ended';
  createdAt: string;
};

export type SerializedMedicalHistory = {
  _id: string;
  chronicConditions: string[];
  surgeries: string | null;
  allergies: string | null;
  familyHistory: string | null;
  currentDoctor: string | null;
  emergencyContact: string | null;
  pregnancyStatus: 'n/a' | 'not_pregnant' | 'pregnant' | 'postpartum' | null;
  updatedAt: string;
} | null;

function serializeInjury(injury: IMemberInjury): SerializedInjury {
  return {
    _id: (injury._id as { toString(): string }).toString(),
    title: injury.title,
    status: injury.status,
    recordedAt: injury.recordedAt.toISOString(),
    resolvedAt: injury.resolvedAt ? injury.resolvedAt.toISOString() : null,
    trainerNotes: injury.trainerNotes,
    memberNotes: injury.memberNotes,
    affectedMovements: injury.affectedMovements,
    injuryType: injury.injuryType,
    bodyPart: injury.bodyPart,
    bodySide: injury.bodySide,
    painAtRest: injury.painAtRest,
    painDuringExercise: injury.painDuringExercise,
    mechanism: injury.mechanism,
    aggravatingFactors: injury.aggravatingFactors,
    relievingFactors: injury.relievingFactors,
    doctorRestrictions: injury.doctorRestrictions,
    rehabilitationStatus: injury.rehabilitationStatus,
    seenDoctor: injury.seenDoctor,
    createdByRole: injury.createdByRole,
  };
}

function serializeMedication(med: IMemberMedication): SerializedMedication {
  return {
    _id: (med._id as { toString(): string }).toString(),
    name: med.name,
    purpose: med.purpose,
    duration: med.duration,
    startDate: med.startDate.toISOString(),
    endDate: med.endDate ? med.endDate.toISOString() : null,
    notes: med.notes,
    status: med.status,
    createdAt: med.createdAt.toISOString(),
  };
}

function serializeMedicalHistory(h: IMemberMedicalHistory | null): SerializedMedicalHistory {
  if (!h) return null;
  return {
    _id: (h._id as { toString(): string }).toString(),
    chronicConditions: h.chronicConditions,
    surgeries: h.surgeries,
    allergies: h.allergies,
    familyHistory: h.familyHistory,
    currentDoctor: h.currentDoctor,
    emergencyContact: h.emergencyContact,
    pregnancyStatus: h.pregnancyStatus,
    updatedAt: h.updatedAt.toISOString(),
  };
}

export default async function MemberHealthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const [injuries, medications, medicalHistory] = await Promise.all([
    new MongoMemberInjuryRepository().findByMember(memberId),
    new MongoMemberMedicationRepository().findByMember(memberId),
    new MongoMemberMedicalHistoryRepository().findByMember(memberId),
  ]);

  const plainInjuries = injuries.map(serializeInjury);
  const plainMedications = medications.map(serializeMedication);
  const plainHistory = serializeMedicalHistory(medicalHistory);

  const role = session.user.role as 'owner' | 'trainer' | 'member';

  return (
    <div className="space-y-10">
      <InjuryClient memberId={memberId} initialInjuries={plainInjuries} userRole={role} />
      <MedicationsSection medications={plainMedications} />
      <MedicalHistorySection history={plainHistory} />
    </div>
  );
}
