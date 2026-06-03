import { apiClient } from './client';
import { CheckIn, CreateCheckInDto } from '../../types/check-ins';
import { UploadConfig } from '../../types/equipment';

export async function fetchCheckIns(): Promise<CheckIn[]> {
  const response = await apiClient.get<CheckIn[]>('/check-ins');
  return response.data;
}

export async function createCheckIn(dto: CreateCheckInDto): Promise<CheckIn> {
  const response = await apiClient.post<CheckIn>('/check-ins', dto);
  return response.data;
}

export async function getCheckInUploadSignature(): Promise<UploadConfig> {
  const response = await apiClient.post<UploadConfig>('/check-ins/upload-signature');
  return response.data;
}
