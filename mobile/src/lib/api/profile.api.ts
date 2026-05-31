import { apiClient } from './client';

export interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  mobile: string | null;
  address: string | null;
  certifications: string[] | null;
  bio: string | null;
  specializations: string[] | null;
  sex: 'male' | 'female' | null;
  fitnessGoal: 'lose_fat' | 'build_muscle' | 'maintain' | 'improve_performance' | null;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | null;
}

export type UpdateProfileDto = Partial<
  Omit<ProfileData, 'email' | 'avatarUrl'>
>;

export async function getProfile(): Promise<ProfileData> {
  const response = await apiClient.get<ProfileData>('/users/me/profile');
  return response.data;
}

export async function updateProfile(dto: UpdateProfileDto): Promise<ProfileData> {
  const response = await apiClient.patch<ProfileData>('/users/me/profile', dto);
  return response.data;
}

export async function uploadAvatar(fileUri: string): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() ?? 'avatar.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const type = mimeMap[ext] ?? 'image/jpeg';

  formData.append('file', { uri: fileUri, name: filename, type } as unknown as Blob);

  const response = await apiClient.post<{ avatarUrl: string }>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
