import { apiClient } from './client';
import {
  EquipmentItem,
  ConditionReport,
  CreateEquipmentDto,
  UpdateEquipmentDto,
  UploadConfig,
} from '../../types/equipment';

export async function fetchEquipment(): Promise<EquipmentItem[]> {
  const response = await apiClient.get<EquipmentItem[]>('/equipment');
  return response.data;
}

export async function createEquipment(dto: CreateEquipmentDto): Promise<EquipmentItem> {
  const response = await apiClient.post<EquipmentItem>('/equipment', dto);
  return response.data;
}

export async function updateEquipment(id: string, dto: UpdateEquipmentDto): Promise<EquipmentItem> {
  const response = await apiClient.patch<EquipmentItem>(`/equipment/${id}`, dto);
  return response.data;
}

export async function deleteEquipment(id: string): Promise<void> {
  await apiClient.delete(`/equipment/${id}`);
}

export async function fetchConditionReports(equipmentId: string): Promise<ConditionReport[]> {
  const response = await apiClient.get<ConditionReport[]>(
    `/equipment/${equipmentId}/condition-reports`,
  );
  return response.data;
}

export async function createConditionReport(
  equipmentId: string,
  note: string,
): Promise<ConditionReport> {
  const response = await apiClient.post<ConditionReport>(
    `/equipment/${equipmentId}/condition-reports`,
    { note },
  );
  return response.data;
}

export async function getUploadSignature(): Promise<UploadConfig> {
  const response = await apiClient.post<UploadConfig>('/equipment/upload-signature');
  return response.data;
}
