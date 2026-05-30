import type { SerializedInjury } from '../page';

export interface InjuryFormData {
  title: string;
  injuryType: string;
  bodyPart: string;
  bodySide: string;
  affectedMovements: string;
  doctorRestrictions: string;
  rehabilitationStatus: string;
  trainerNotes: string;
}

export const EMPTY_INJURY_FORM: InjuryFormData = {
  title: '',
  injuryType: '',
  bodyPart: '',
  bodySide: '',
  affectedMovements: '',
  doctorRestrictions: '',
  rehabilitationStatus: '',
  trainerNotes: '',
};

export function injuryToForm(injury: SerializedInjury): InjuryFormData {
  return {
    title: injury.title,
    injuryType: injury.injuryType ?? '',
    bodyPart: injury.bodyPart ?? '',
    bodySide: injury.bodySide ?? '',
    affectedMovements: injury.affectedMovements ?? '',
    doctorRestrictions: injury.doctorRestrictions ?? '',
    rehabilitationStatus: injury.rehabilitationStatus ?? '',
    trainerNotes: injury.trainerNotes ?? '',
  };
}
