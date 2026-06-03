import { apiClient } from './client';
import {
  NutritionTemplate,
  CreateNutritionTemplateDto,
  UpdateNutritionTemplateDto,
} from '../../types/nutrition-templates';

export async function fetchTemplates(): Promise<NutritionTemplate[]> {
  const response = await apiClient.get<NutritionTemplate[]>('/nutrition-templates');
  return response.data;
}

export async function createTemplate(
  dto: CreateNutritionTemplateDto,
): Promise<NutritionTemplate> {
  const response = await apiClient.post<NutritionTemplate>('/nutrition-templates', dto);
  return response.data;
}

export async function updateTemplate(
  id: string,
  dto: UpdateNutritionTemplateDto,
): Promise<NutritionTemplate> {
  const response = await apiClient.patch<NutritionTemplate>(`/nutrition-templates/${id}`, dto);
  return response.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/nutrition-templates/${id}`);
}
