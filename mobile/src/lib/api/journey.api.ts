import { apiClient } from './client';
import { JourneySummary } from '../../types/journey';

export async function fetchJourney(): Promise<JourneySummary> {
  const response = await apiClient.get<JourneySummary>('/journey');
  return response.data;
}
