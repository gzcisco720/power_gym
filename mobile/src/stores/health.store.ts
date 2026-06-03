import { create } from 'zustand';
import {
  getInjuries,
  createInjury,
  updateInjury,
  deleteInjury,
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication,
  getMedicalHistory,
  saveMedicalHistory as apiSaveMedicalHistory,
} from '../lib/api/health.api';
import {
  Injury,
  CreateInjuryDto,
  UpdateInjuryDto,
  Medication,
  CreateMedicationDto,
  UpdateMedicationDto,
  MedicalHistory,
  UpdateMedicalHistoryDto,
} from '../types/health';

interface HealthState {
  // Injuries slice
  injuries: Injury[];
  injuriesLoading: boolean;
  injuriesError: string | null;
  fetchInjuries(): Promise<void>;
  addInjury(dto: CreateInjuryDto): Promise<void>;
  updateInjury(id: string, dto: UpdateInjuryDto): Promise<void>;
  deleteInjury(id: string): Promise<void>;

  // Medications slice
  medications: Medication[];
  medicationsLoading: boolean;
  medicationsError: string | null;
  fetchMedications(): Promise<void>;
  addMedication(dto: CreateMedicationDto): Promise<void>;
  updateMedication(id: string, dto: UpdateMedicationDto): Promise<void>;
  deleteMedication(id: string): Promise<void>;

  // Medical history slice
  medicalHistory: MedicalHistory | null;
  medicalHistoryLoading: boolean;
  medicalHistoryError: string | null;
  fetchMedicalHistory(): Promise<void>;
  saveMedicalHistory(dto: UpdateMedicalHistoryDto): Promise<void>;
}

export const useHealthStore = create<HealthState>((set) => ({
  // Injuries
  injuries: [],
  injuriesLoading: false,
  injuriesError: null,

  async fetchInjuries(): Promise<void> {
    set({ injuriesLoading: true, injuriesError: null });
    try {
      const injuries = await getInjuries();
      set({ injuries, injuriesLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ injuriesLoading: false, injuriesError: message });
    }
  },

  async addInjury(dto: CreateInjuryDto): Promise<void> {
    const injury = await createInjury(dto);
    set((state) => ({ injuries: [injury, ...state.injuries] }));
  },

  async updateInjury(id: string, dto: UpdateInjuryDto): Promise<void> {
    const updated = await updateInjury(id, dto);
    set((state) => ({
      injuries: state.injuries.map((inj) => (inj._id === id ? updated : inj)),
    }));
  },

  async deleteInjury(id: string): Promise<void> {
    await deleteInjury(id);
    set((state) => ({
      injuries: state.injuries.filter((inj) => inj._id !== id),
    }));
  },

  // Medications
  medications: [],
  medicationsLoading: false,
  medicationsError: null,

  async fetchMedications(): Promise<void> {
    set({ medicationsLoading: true, medicationsError: null });
    try {
      const medications = await getMedications();
      set({ medications, medicationsLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ medicationsLoading: false, medicationsError: message });
    }
  },

  async addMedication(dto: CreateMedicationDto): Promise<void> {
    const medication = await createMedication(dto);
    set((state) => ({ medications: [medication, ...state.medications] }));
  },

  async updateMedication(id: string, dto: UpdateMedicationDto): Promise<void> {
    const updated = await updateMedication(id, dto);
    set((state) => ({
      medications: state.medications.map((med) => (med._id === id ? updated : med)),
    }));
  },

  async deleteMedication(id: string): Promise<void> {
    await deleteMedication(id);
    set((state) => ({
      medications: state.medications.filter((med) => med._id !== id),
    }));
  },

  // Medical history
  medicalHistory: null,
  medicalHistoryLoading: false,
  medicalHistoryError: null,

  async fetchMedicalHistory(): Promise<void> {
    set({ medicalHistoryLoading: true, medicalHistoryError: null });
    try {
      const medicalHistory = await getMedicalHistory();
      set({ medicalHistory, medicalHistoryLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ medicalHistoryLoading: false, medicalHistoryError: message });
    }
  },

  async saveMedicalHistory(dto: UpdateMedicalHistoryDto): Promise<void> {
    const medicalHistory = await apiSaveMedicalHistory(dto);
    set({ medicalHistory });
  },
}));
