import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoMemberInjuryRepository } from '@/lib/repositories/member-injury.repository';
import { MongoMemberMedicationRepository } from '@/lib/repositories/member-medication.repository';
import { MongoMemberMedicalHistoryRepository } from '@/lib/repositories/member-medical-history.repository';
import type { IMemberInjury } from '@/lib/db/models/member-injury.model';
import type { IMemberMedication } from '@/lib/db/models/member-medication.model';
import type { IMemberMedicalHistory } from '@/lib/db/models/member-medical-history.model';
import { HealthClient } from './_components/health-client';

export type SerializedInjury = {
  _id: string;
  title: string;
  status: 'active' | 'resolved';
  recordedAt: string;
  resolvedAt: string | null;
  memberNotes: string | null;
  trainerNotes: string | null;
  affectedMovements: string | null;
  injuryType: 'acute' | 'chronic' | 'post_surgery' | null;
  bodyPart: 'knee' | 'shoulder' | 'lower_back' | 'hip' | 'ankle' | 'wrist' | 'neck' | 'other' | null;
  bodySide: 'left' | 'right' | 'bilateral' | null;
  painAtRest: number | null;
  painDuringExercise: number | null;
  mechanism: string | null;
  aggravatingFactors: string | null;
  relievingFactors: string | null;
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
};

export type SerializedMedicalHistory = {
  chronicConditions: string[];
  surgeries: string | null;
  allergies: string | null;
  familyHistory: string | null;
  currentDoctor: string | null;
  emergencyContact: string | null;
  pregnancyStatus: 'n/a' | 'not_pregnant' | 'pregnant' | 'postpartum' | null;
} | null;

function serializeInjury(i: IMemberInjury): SerializedInjury {
  return {
    _id: (i._id as { toString(): string }).toString(),
    title: i.title,
    status: i.status,
    recordedAt: i.recordedAt.toISOString(),
    resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
    memberNotes: i.memberNotes,
    trainerNotes: i.trainerNotes,
    affectedMovements: i.affectedMovements,
    injuryType: i.injuryType,
    bodyPart: i.bodyPart,
    bodySide: i.bodySide,
    painAtRest: i.painAtRest,
    painDuringExercise: i.painDuringExercise,
    mechanism: i.mechanism,
    aggravatingFactors: i.aggravatingFactors,
    relievingFactors: i.relievingFactors,
    seenDoctor: i.seenDoctor,
    createdByRole: i.createdByRole,
  };
}

function serializeMedication(m: IMemberMedication): SerializedMedication {
  return {
    _id: (m._id as { toString(): string }).toString(),
    name: m.name,
    purpose: m.purpose,
    duration: m.duration,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate ? m.endDate.toISOString() : null,
    notes: m.notes,
    status: m.status,
  };
}

function serializeMedicalHistory(h: IMemberMedicalHistory | null): SerializedMedicalHistory {
  if (!h) return null;
  return {
    chronicConditions: h.chronicConditions,
    surgeries: h.surgeries,
    allergies: h.allergies,
    familyHistory: h.familyHistory,
    currentDoctor: h.currentDoctor,
    emergencyContact: h.emergencyContact,
    pregnancyStatus: h.pregnancyStatus,
  };
}

export default async function MemberHealthPage() {
  const session = await auth();
  if (!session?.user) return null;

  const memberId = session.user.id;

  await connectDB();

  const [injuries, medications, medicalHistory] = await Promise.all([
    new MongoMemberInjuryRepository().findByMember(memberId),
    new MongoMemberMedicationRepository().findByMember(memberId),
    new MongoMemberMedicalHistoryRepository().findByMember(memberId),
  ]);

  return (
    <div>
      <div className="px-4 sm:px-8 py-6">
        <h1 className="text-xl font-semibold text-foreground">My Health</h1>
        <p className="text-sm text-foreground/65 mt-0.5">Your injuries, medications, and medical background</p>
      </div>

      <HealthClient
        memberId={memberId}
        initialInjuries={injuries.map(serializeInjury)}
        initialMedications={medications.map(serializeMedication)}
        initialHistory={serializeMedicalHistory(medicalHistory)}
      />
    </div>
  );
}
