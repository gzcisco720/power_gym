import { apiClient } from './client';

export interface GymInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  logoUrl: string | null;
  loginLogoUrl: string | null;
}

export type UpdateGymInfoDto = Partial<Omit<GymInfo, 'logoUrl' | 'loginLogoUrl'>>;

export async function getGymInfo(): Promise<GymInfo> {
  const response = await apiClient.get<GymInfo>('/gym/info');
  return response.data;
}

export async function updateGymInfo(dto: UpdateGymInfoDto): Promise<GymInfo> {
  const response = await apiClient.patch<GymInfo>('/gym/info', dto);
  return response.data;
}

export async function uploadLogo(
  fileUri: string,
  kind: 'sidebar' | 'login',
): Promise<{ logoUrl: string }> {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() ?? 'logo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const type = mimeMap[ext] ?? 'image/jpeg';

  formData.append('file', { uri: fileUri, name: filename, type } as unknown as Blob);
  formData.append('kind', kind);

  const response = await apiClient.post<{ logoUrl: string }>('/gym/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
