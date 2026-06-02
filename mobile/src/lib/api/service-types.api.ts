import { apiClient } from './client';
import { ServiceType, CreateServiceTypeDto, UpdateServiceTypeDto } from '../../types/service-types';

export async function fetchServiceTypes(): Promise<ServiceType[]> {
  const response = await apiClient.get<ServiceType[]>('/service-types');
  return response.data;
}

export async function createServiceType(dto: CreateServiceTypeDto): Promise<ServiceType> {
  const response = await apiClient.post<ServiceType>('/service-types', dto);
  return response.data;
}

export async function updateServiceType(id: string, dto: UpdateServiceTypeDto): Promise<ServiceType> {
  const response = await apiClient.patch<ServiceType>(`/service-types/${id}`, dto);
  return response.data;
}
