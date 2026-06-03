export interface Member {
  id: string;
  name: string;
  email: string;
  trainerId: string | null;
  trainerName: string | null;
}

export interface MemberOverview {
  joinedAt: string | null;
  lastBodyTestDate: string | null;
  lastCheckinDate: string | null;
}
