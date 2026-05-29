import { request } from './client';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export const fetchProfile = () => request<UserProfile>('/api/v1/profile');

export const updateProfile = (data: Partial<UserProfile>) =>
  request<UserProfile>('/api/v1/profile', { method: 'PATCH', body: JSON.stringify(data) });

export const changePassword = (currentPassword: string, newPassword: string) =>
  request<{ success: boolean }>('/api/v1/account/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

export const changeEmail = (email: string) =>
  request<{ success: boolean }>('/api/v1/account/email', {
    method: 'PATCH',
    body: JSON.stringify({ email }),
  });
