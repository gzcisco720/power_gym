import { apiClient } from './client';
import { JourneySummary, JourneyTimelinePage } from '../../types/journey';

export async function fetchJourney(): Promise<JourneySummary> {
  const response = await apiClient.get<JourneySummary>('/journey');
  return response.data;
}

export async function fetchJourneyTimeline(cursor?: string | null): Promise<JourneyTimelinePage> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  const response = await apiClient.get<JourneyTimelinePage>('/journey/timeline', { params });
  return response.data;
}
