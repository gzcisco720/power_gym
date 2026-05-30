import { request, requestVoid } from './client';

export interface CalendarSession {
  _id: string;
  seriesId: string | null;
  trainerId: string;
  memberIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  serviceTypeId: string | null;
  customServiceName: string | null;
  customFee: number | null;
  reminderSentAt: string | null;
}

export interface CreateSessionPayload {
  trainerId: string;
  memberIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  serviceTypeId: string | null;
  customServiceName: string | null;
  customFee: number | null;
}

export type RecurringScope = 'one' | 'future' | 'all';

const BASE = '/api/v1';

export async function fetchSessions(
  start: string,
  end: string,
  trainerId?: string,
): Promise<CalendarSession[]> {
  let url = `${BASE}/schedule?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  if (trainerId) url += `&trainerId=${encodeURIComponent(trainerId)}`;
  const data = await request<{ sessions: CalendarSession[] }>(url);
  return data.sessions;
}

export async function createSession(payload: CreateSessionPayload): Promise<CalendarSession> {
  return request<CalendarSession>(`${BASE}/schedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSession(
  id: string,
  payload: { scope: RecurringScope; startTime: string; endTime: string; serviceTypeId?: string | null; customServiceName?: string | null; customFee?: number | null },
): Promise<void> {
  return requestVoid(`${BASE}/schedule/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function cancelSession(id: string, scope: RecurringScope): Promise<void> {
  return requestVoid(`${BASE}/schedule/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ scope }),
  });
}

/** Fetch trainers + members for the owner calendar UI (uses owner endpoints). */
export async function fetchCalendarParticipants(
  currentUserDisplayName: string,
  currentUserId: string,
): Promise<{
  trainers: Array<{ _id: string; name: string }>;
  members: Array<{ _id: string; name: string; trainerId: string }>;
}> {
  const [trainersData, membersData] = await Promise.all([
    request<{ trainers: Array<{ _id: string; name: string }> }>(`${BASE}/owner/trainers`),
    request<{ members: Array<{ _id: string; name: string; trainerId: string }> }>(`${BASE}/owner/members`),
  ]);
  const trainers = [
    { _id: currentUserId, name: `Me (${currentUserDisplayName})` },
    ...trainersData.trainers,
  ];
  return { trainers, members: membersData.members };
}
