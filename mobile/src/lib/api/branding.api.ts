import { apiClient } from './client';

export interface BrandingResponse {
  gymName: string | null;
  logoUrl: string | null;
}

export async function fetchBranding(): Promise<BrandingResponse> {
  const response = await apiClient.get<BrandingResponse>('/gym/branding');
  return response.data;
}
