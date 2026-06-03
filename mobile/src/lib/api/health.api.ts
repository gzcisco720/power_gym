import { apiClient } from './client';
import {
  Injury,
  CreateInjuryDto,
  UpdateInjuryDto,
  Medication,
  CreateMedicationDto,
  UpdateMedicationDto,
  MedicalHistory,
  UpdateMedicalHistoryDto,
} from '../../types/health';

export async function getInjuries(): Promise<Injury[]> {
  const response = await apiClient.get<Injury[]>('/health/injuries');
  return response.data;
}

export async function createInjury(dto: CreateInjuryDto): Promise<Injury> {
  const response = await apiClient.post<Injury>('/health/injuries', dto);
  return response.data;
}

export async function updateInjury(id: string, dto: UpdateInjuryDto): Promise<Injury> {
  const response = await apiClient.patch<Injury>(`/health/injuries/${id}`, dto);
  return response.data;
}

export async function deleteInjury(id: string): Promise<void> {
  await apiClient.delete(`/health/injuries/${id}`);
}

export async function getMedications(): Promise<Medication[]> {
  const response = await apiClient.get<Medication[]>('/health/medications');
  return response.data;
}

export async function createMedication(dto: CreateMedicationDto): Promise<Medication> {
  const response = await apiClient.post<Medication>('/health/medications', dto);
  return response.data;
}

export async function updateMedication(id: string, dto: UpdateMedicationDto): Promise<Medication> {
  const response = await apiClient.patch<Medication>(`/health/medications/${id}`, dto);
  return response.data;
}

export async function deleteMedication(id: string): Promise<void> {
  await apiClient.delete(`/health/medications/${id}`);
}

export async function getMedicalHistory(): Promise<MedicalHistory> {
  const response = await apiClient.get<MedicalHistory>('/health/medical-background');
  return response.data;
}

export async function saveMedicalHistory(dto: UpdateMedicalHistoryDto): Promise<MedicalHistory> {
  const response = await apiClient.put<MedicalHistory>('/health/medical-background', dto);
  return response.data;
}
