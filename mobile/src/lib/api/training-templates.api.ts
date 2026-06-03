import { apiClient } from './client';
import { PlanTemplate, CreatePlanTemplateDto, UpdatePlanTemplateDto } from '../../types/training-templates';

export async function fetchTemplates(): Promise<PlanTemplate[]> {
  const response = await apiClient.get<PlanTemplate[]>('/plan-templates');
  return response.data;
}

export async function createTemplate(dto: CreatePlanTemplateDto): Promise<PlanTemplate> {
  const response = await apiClient.post<PlanTemplate>('/plan-templates', dto);
  return response.data;
}

export async function updateTemplate(id: string, dto: UpdatePlanTemplateDto): Promise<PlanTemplate> {
  const response = await apiClient.patch<PlanTemplate>(`/plan-templates/${id}`, dto);
  return response.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await apiClient.delete(`/plan-templates/${id}`);
}
