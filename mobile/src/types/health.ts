// Injury types
export type InjuryStatus = 'active' | 'resolved';
export type InjuryType = 'acute' | 'chronic' | 'post_surgery';
export type BodyPart = 'knee' | 'shoulder' | 'lower_back' | 'hip' | 'ankle' | 'wrist' | 'neck' | 'other';
export type BodySide = 'left' | 'right' | 'bilateral';
export type RehabStatus = 'not_started' | 'in_progress' | 'cleared';
export type CreatedByRole = 'trainer' | 'member';

export interface Injury {
  _id: string;
  memberId: string;
  title: string;
  status: InjuryStatus;
  recordedAt: string; // ISO date string
  trainerNotes: string | null;
  memberNotes: string | null;
  affectedMovements: string | null;
  injuryType: InjuryType | null;
  bodyPart: BodyPart | null;
  bodySide: BodySide | null;
  painAtRest: number | null;
  painDuringExercise: number | null;
  mechanism: string | null;
  aggravatingFactors: string | null;
  relievingFactors: string | null;
  seenDoctor: boolean;
  doctorRestrictions: string | null;
  rehabilitationStatus: RehabStatus | null;
  resolvedAt: string | null; // ISO date string
  createdByRole: CreatedByRole;
  createdAt: string; // ISO date string
}

export interface CreateInjuryDto {
  title: string;
  memberNotes?: string;
  affectedMovements?: string;
  injuryType?: InjuryType;
  bodyPart?: BodyPart;
  bodySide?: BodySide;
  painAtRest?: number;
  painDuringExercise?: number;
  mechanism?: string;
  aggravatingFactors?: string;
  relievingFactors?: string;
  seenDoctor?: boolean;
  doctorRestrictions?: string;
  rehabilitationStatus?: RehabStatus;
}

export interface UpdateInjuryDto {
  title?: string;
  status?: InjuryStatus;
  memberNotes?: string;
  affectedMovements?: string;
  injuryType?: InjuryType;
  bodyPart?: BodyPart;
  bodySide?: BodySide;
  painAtRest?: number;
  painDuringExercise?: number;
  mechanism?: string;
  aggravatingFactors?: string;
  relievingFactors?: string;
  seenDoctor?: boolean;
  doctorRestrictions?: string;
  rehabilitationStatus?: RehabStatus;
}

// Medication types
export type MedicationDuration = 'long_term' | 'short_term';
export type MedicationStatus = 'active' | 'ended';

export interface Medication {
  _id: string;
  memberId: string;
  name: string;
  purpose: string;
  duration: MedicationDuration;
  startDate: string; // ISO date string
  endDate: string | null; // ISO date string
  notes: string | null;
  status: MedicationStatus;
  createdAt: string; // ISO date string
}

export interface CreateMedicationDto {
  name: string;
  purpose: string;
  duration: MedicationDuration;
  startDate: string;
  notes?: string;
}

export interface UpdateMedicationDto {
  name?: string;
  purpose?: string;
  duration?: MedicationDuration;
  startDate?: string;
  endDate?: string;
  notes?: string;
  status?: MedicationStatus;
}

// Medical history types
export type PregnancyStatus = 'n/a' | 'not_pregnant' | 'pregnant' | 'postpartum';

export interface MedicalHistory {
  _id?: string;
  memberId: string;
  chronicConditions: string[];
  surgeries: string | null;
  allergies: string | null;
  familyHistory: string | null;
  currentDoctor: string | null;
  emergencyContact: string | null;
  pregnancyStatus: PregnancyStatus | null;
  updatedAt?: string; // ISO date string
}

export interface UpdateMedicalHistoryDto {
  chronicConditions?: string[];
  surgeries?: string;
  allergies?: string;
  familyHistory?: string;
  currentDoctor?: string;
  emergencyContact?: string;
  pregnancyStatus?: PregnancyStatus;
}
